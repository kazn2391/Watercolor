import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile } from '@/lib/drive-reader';
import { getDriveFolderName, serviceCreateOrGetSubfolder, serviceMoveFile } from '@/lib/drive-writer';
import { oauthCreateOrGetSubfolder, oauthUploadFileToDrive } from '@/lib/drive-oauth-writer';
import { generateEtsySeo } from '@/lib/ai-seo';
import { removeBackground } from '@/lib/photoroom';
import { upscaleToJpeg, buildBaseNameFromTitle } from '@/lib/image-upscaler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ADMIN_PASSWORD = 'Kuzey2391';

async function processBatch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<{ results: (R | null)[]; errors: number }> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let errors = 0;
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        errors++;
        results[i] = null;
      }
    }
  }
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) workers.push(worker());
  await Promise.all(workers);
  return { results, errors };
}

async function describeImageBuffer(buf: Buffer): Promise<string> {
  const small = await sharp(buf)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const b64 = small.toString('base64');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
            { type: 'text', text: 'Describe this clipart design in one short phrase. Name the exact subject, the art style, and main colors. Max 15 words. Be specific about the subject.' },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Image analiz hatasi: ' + JSON.stringify(data).slice(0, 200));
  let t = '';
  for (const b of data.content || []) {
    if (b.type === 'text') t += b.text;
  }
  return t.trim().slice(0, 150);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  const isOldKey = process.env.CRON_SECRET && adminKey === process.env.CRON_SECRET;
  if (!isOldKey && adminKey !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let driveUrl = '';
  let generatePng = false;
  let upscaleImages = false;
  let shopKey: string = 'shop1';
  let productType: 'auto' | 'line_art' = 'auto';
  let jobId = '';
  try {
    const bodyJson = await req.json();
    driveUrl = bodyJson.driveUrl || '';
    generatePng = bodyJson.generatePng === true;
    upscaleImages = bodyJson.upscaleImages === true;
    shopKey = bodyJson.shopKey === 'shop2' ? 'shop2' : 'shop1';
    productType = bodyJson.productType === 'line_art' ? 'line_art' : 'auto';
    jobId = typeof bodyJson.jobId === 'string' && bodyJson.jobId
      ? bodyJson.jobId.slice(0, 60)
      : 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  } catch (e) {
    return NextResponse.json({ error: 'driveUrl gerekli' }, { status: 400 });
  }
  if (!driveUrl) return NextResponse.json({ error: 'driveUrl bos' }, { status: 400 });

  const db = supabaseAdmin();
  const steps: string[] = [];
  const t0 = Date.now();
  const elapsed = () => Math.round((Date.now() - t0) / 1000) + 's';

  let lastFlush = 0;
  async function writeJob(patch: Record<string, any>) {
    try {
      await db.from('etsy_jobs').upsert({
        id: jobId,
        steps: steps,
        updated_at: new Date().toISOString(),
        ...patch,
      });
    } catch (e) {}
  }
  function log(msg: string) {
    steps.push(msg);
    const now = Date.now();
    if (now - lastFlush > 1500) {
      lastFlush = now;
      void writeJob({ status: 'running' });
    }
  }

  await writeJob({ status: 'running', result: null, error: null, stage1: null });
    // Uzun batch islemlerinde updated_at donmasin diye kalp atisi
  const heartbeat = setInterval(() => {
    void writeJob({ status: 'running' });
  }, 20000);

  try {
    const shopLabel = shopKey === 'shop2' ? 'SuzyCardPrints' : 'SuzyFlowArt';
        clearInterval(heartbeat);
    log('[' + elapsed() + '] ASAMA 1 basladi | Shop: ' + shopLabel + ' | Tip: ' + (productType === 'line_art' ? 'Line Art' : 'Auto'));

    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) {
      await writeJob({ status: 'error', error: 'Klasorde resim bulunamadi. Herkese acik mi?' });
      return NextResponse.json({ error: 'Klasorde resim bulunamadi', steps }, { status: 400 });
    }
    log('[' + elapsed() + '] ' + folder.imageCount + ' resim bulundu, PNG subfolder: ' + folder.hasPngSubfolder);

    // Analiz icin ilk 2 resim
    const analyzeBatch = await processBatch(folder.images.slice(0, 2), 2, async (img) => downloadDriveFile(img.id));
    const analyzeBuffers: Buffer[] = analyzeBatch.results.filter((b): b is Buffer => b !== null);

    const descBatch = await processBatch(analyzeBuffers, 2, async (buf) => describeImageBuffer(buf));
    const descs: string[] = descBatch.results.filter((d): d is string => d !== null && d.length > 3);
    if (descs.length === 0) {
      await writeJob({ status: 'error', error: 'Resimler analiz edilemedi.' });
      return NextResponse.json({ error: 'Resimler analiz edilemedi.', steps }, { status: 400 });
    }
    log('[' + elapsed() + '] Analiz: ' + descs[0].slice(0, 60));

    let folderNumber = '';
    try {
      if (folder.folderId) {
        const currentFolderName = await getDriveFolderName(folder.folderId);
        const numMatch = currentFolderName.match(/^(\d+)/);
        if (numMatch) folderNumber = numMatch[1];
      }
    } catch (e) {}
    if (folderNumber) log('[' + elapsed() + '] Klasor numarasi: ' + folderNumber);

    // Tum resimleri indir
    const allImageBuffers: Buffer[] = new Array(folder.images.length).fill(null);
    for (let i = 0; i < analyzeBuffers.length; i++) allImageBuffers[i] = analyzeBuffers[i];
    const remaining: number[] = [];
    for (let i = analyzeBuffers.length; i < folder.images.length; i++) remaining.push(i);
    if (remaining.length > 0) {
      log('[' + elapsed() + '] ' + remaining.length + ' resim paralel indiriliyor');
      await processBatch(remaining, 8, async (idx) => {
        allImageBuffers[idx] = await downloadDriveFile(folder.images[idx].id);
        return true;
      });
    }
    log('[' + elapsed() + '] Toplam ' + allImageBuffers.filter(Boolean).length + ' resim hazir');

    const validBuffers: { buf: Buffer; idx: number }[] = [];
    for (let i = 0; i < allImageBuffers.length; i++) {
      if (allImageBuffers[i]) validBuffers.push({ buf: allImageBuffers[i], idx: i });
    }

    // ===== PNG hemen basla (SEO ve upscale ile paralel) =====
    const pngPromise = (async (): Promise<boolean> => {
      if (!generatePng) return false;
      try {
        if (!folder.folderId) throw new Error('Folder ID yok');
        const pngFolderId = await oauthCreateOrGetSubfolder(folder.folderId, 'Png');
        log('[' + elapsed() + '] PNG uretimi basladi (paralel)');
        const pngBatch = await processBatch(validBuffers, 5, async (item) => {
          const pngBuf = await removeBackground(item.buf);
          const pngName = buildBaseNameFromTitle('placeholder') + (item.idx + 1) + '.png';
          await oauthUploadFileToDrive(pngFolderId, pngName, pngBuf, 'image/png');
          return true;
        });
        const ok = pngBatch.results.filter((r) => r === true).length;
        log('[' + elapsed() + '] PNG sonuc: ' + ok + ' basarili, ' + pngBatch.errors + ' hatali');
        return ok > 0;
      } catch (e: any) {
        log('PNG uretim HATASI: ' + (e.message || 'bilinmeyen'));
        return false;
      }
    })();

    // ===== SEO =====
    const seo = await generateEtsySeo({
      imageDescriptions: descs,
      fileCount: folder.imageCount,
      hasPdf: folder.hasPdf,
      hasPng: folder.hasPng,
      hasJpg: folder.hasJpg,
      hasPngSubfolder: folder.hasPngSubfolder || generatePng,
      folderNumber,
      productType,
    });
    log('[' + elapsed() + '] SEO uretildi: ' + seo.title.slice(0, 55));

    // ===== UPSCALE (PNG hala arka planda calisiyor olabilir) =====
    const baseName = buildBaseNameFromTitle(seo.title);
    let upscaleApplied = false;

    if (upscaleImages) {
      log('[' + elapsed() + '] Upscale basladi (PNG ile paralel, 4032x4032)');
      try {
        if (!folder.folderId) throw new Error('Folder ID yok');
        const upBatch = await processBatch(validBuffers, 5, async (item) => {
          const bigBuf = await upscaleToJpeg(item.buf);
          await oauthUploadFileToDrive(folder.folderId!, baseName + (item.idx + 1) + '.jpg', bigBuf, 'image/jpeg');
          return true;
        });
        const upOk = upBatch.results.filter((r) => r === true).length;
        log('[' + elapsed() + '] Upscale sonuc: ' + upOk + ' basarili, ' + upBatch.errors + ' hatali');

        if (upOk === validBuffers.length) {
          try {
            const lqId = await serviceCreateOrGetSubfolder(folder.folderId, 'Low Quality');
            const mv = await processBatch(folder.images, 8, async (img) => {
              await serviceMoveFile(img.id, folder.folderId!, lqId);
              return true;
            });
            log('[' + elapsed() + '] Eski dosyalar tasindi: ' + mv.results.filter((r) => r === true).length + ' basarili');
            upscaleApplied = true;
          } catch (e: any) {
            log('Low Quality HATASI: ' + (e.message || 'bilinmeyen'));
            upscaleApplied = true;
          }
        } else {
          log('UYARI: Upscale tam basarili degil, eski dosyalar tasinmadi');
        }
      } catch (e: any) {
        log('Upscale HATASI: ' + (e.message || 'bilinmeyen'));
      }
    }

    const pngGenerated = await pngPromise;
    const finalHasPngSubfolder = folder.hasPngSubfolder || pngGenerated;

    // ===== STAGE1 KAYDET + FINALIZE TETIKLE =====
    const stage1 = {
      driveUrl,
      shopKey,
      productType,
      seo,
      folderNumber,
      upscaleApplied,
      baseName,
      finalHasPngSubfolder,
    };

    log('[' + elapsed() + '] ASAMA 1 tamam - Etsy asamasi tetikleniyor');
    steps.push('─────────────────────');
    await writeJob({ status: 'finalizing', stage1 });

    // Kendi domainimizde finalize'i tetikle - cevabini BEKLEMEDEN
    const origin = new URL(req.url).origin;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      await fetch(origin + '/api/etsy/finalize?key=' + ADMIN_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
        signal: ctrl.signal,
      });
    } catch (e) {
      // abort beklenen durum - istek gitti, finalize kendi basina calisiyor
    }
    clearTimeout(timer);

    return NextResponse.json({ success: true, stage: 'prepare_done', jobId, steps });
    } catch (err: any) {
    clearInterval(heartbeat);
    await writeJob({ status: 'error', error: err.message });
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
