import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile, extractFolderId } from '@/lib/drive-reader';
import {
  renameDriveFolder,
  getDriveFolderName,
  serviceCreateOrGetSubfolder,
  serviceMoveFile,
} from '@/lib/drive-writer';
import {
  oauthCreateOrGetSubfolder,
  oauthUploadFileToDrive,
} from '@/lib/drive-oauth-writer';
import { generateEtsySeo } from '@/lib/ai-seo';
import { removeBackground } from '@/lib/photoroom';
import { upscaleToJpeg, buildBaseNameFromTitle } from '@/lib/image-upscaler';
import { rewritePdfDownloadLink } from '@/lib/pdf-rewrite';
import {
  createDraftListing,
  uploadListingImage,
  uploadListingFile,
  uploadListingVideo,
  findClipArtTaxonomyId,
  updateListingProperty,
} from '@/lib/etsy-listing';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const BONUS_IMAGE_URL = 'https://qugrildnvbvrtxcltefy.supabase.co/storage/v1/object/public/etsy-videos/suzypic.jpg';
const VIDEO_URL = 'https://qugrildnvbvrtxcltefy.supabase.co/storage/v1/object/public/etsy-videos/suzyflow.mp4';

const PROP_CRAFT = 47626759760;
const PROP_OCCASION = 46803063641;
const PROP_HOLIDAY = 46803063659;
const PROP_SUBJECT = 400394338806;

const CRAFT_VALUES = [538, 541, 562, 584];
const CRAFT_NAMES = ['Card making & stationery', 'Collage', "Kids' crafts", 'Scrapbooking'];

const SUBJECT_MAP: Record<string, number> = {
  'abstract and geometric': 2817, animal: 2558, 'anime and cartoon': 2559,
  'architecture and cityscape': 3641, 'beach and tropical': 406, 'comics and manga': 2562,
  'fantasy and sci fi': 421, fashion: 3691, flowers: 2952, 'food and drink': 425,
  'geography and locale': 2957, 'horror and gothic': 2953, 'humorous saying': 2954,
  'inspirational saying': 2955, 'landscape and scenery': 3644, 'love and friendship': 439,
  military: 2549, music: 442, nautical: 443, 'patriotic and flags': 447,
  'people and portrait': 3694, 'pet portrait': 2340, 'phrase and saying': 2962,
  'plants and trees': 2530, religious: 456, 'science and tech': 458,
  'sports and fitness': 461, 'stars and celestial': 2532, steampunk: 2533,
  'travel and transportation': 470, 'western and cowboy': 474, zodiac: 2534,
};

const OCCASION_MAP: Record<string, number> = {
  birthday: 19, anniversary: 12, 'baby shower': 13, wedding: 32,
  graduation: 24, engagement: 22, 'bridal shower': 20,
};

const HOLIDAY_MAP: Record<string, number> = {
  christmas: 35, easter: 37, halloween: 39, thanksgiving: 46,
  'valentines day': 48, 'mothers day': 43, 'fathers day': 38,
  'new years': 44, 'st patricks day': 45,
};

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
      const myIndex = nextIndex++;
      if (myIndex >= items.length) break;
      try {
        results[myIndex] = await fn(items[myIndex], myIndex);
      } catch (e) {
        errors++;
        results[myIndex] = null;
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { results, errors };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('URL fetch failed: ' + res.status + ' ' + url.slice(0, 80));
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
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
  if (!res.ok) {
    throw new Error('Image analiz hatasi: ' + JSON.stringify(data).slice(0, 200));
  }
  let t = '';
  for (const b of data.content || []) {
    if (b.type === 'text') t += b.text;
  }
  return t.trim().slice(0, 150);
}

function buildAltText(altBase: string, rank: number, total: number): string {
  const variants = [
    altBase + ' high resolution clipart design',
    altBase + ' printable digital download',
    altBase + ' for crafts cards and scrapbooking',
    altBase + ' commercial use clipart set',
    altBase + ' watercolor style design element',
    altBase + ' digital art file',
    altBase + ' for sublimation and print projects',
    altBase + ' instant download craft supply',
    altBase + ' digital clipart illustration',
    altBase + ' design ' + rank + ' of ' + total,
  ];
  const v = variants[(rank - 1) % variants.length];
  return v.slice(0, 250);
}

async function uploadListingImageWithRetry(
  listingId: number | string,
  buf: Buffer,
  rank: number,
  alt: string,
  shopKey: string,
  maxAttempts: number = 3
): Promise<{ success: boolean; error: string }> {
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await uploadListingImage(listingId as number, buf, rank, alt, shopKey);
      return { success: true, error: '' };
    } catch (e: any) {
      lastError = (e.message || 'bilinmeyen').slice(0, 150);
      if (attempt < maxAttempts) {
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }
  return { success: false, error: lastError };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  const isOldKey = process.env.CRON_SECRET && adminKey === process.env.CRON_SECRET;
  const isNewPassword = adminKey === ADMIN_PASSWORD;
  if (!isOldKey && !isNewPassword) {
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
    jobId = typeof bodyJson.jobId === 'string' ? bodyJson.jobId.slice(0, 60) : '';
  } catch (e) {
    return NextResponse.json({ error: 'driveUrl gerekli' }, { status: 400 });
  }
  if (!driveUrl) {
    return NextResponse.json({ error: 'driveUrl bos' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const steps: string[] = [];
  const t0 = Date.now();
  const elapsed = () => Math.round((Date.now() - t0) / 1000) + 's';

  let lastFlush = 0;
  async function writeJob(patch: Record<string, any>, force: boolean = false) {
    if (!jobId) return;
    try {
      await db.from('etsy_jobs').upsert({
        id: jobId,
        steps: steps,
        updated_at: new Date().toISOString(),
        ...patch,
      });
    } catch (e) {
      // job yazimi asla ana isi durdurmasin
    }
  }
  function log(msg: string) {
    steps.push(msg);
    const now = Date.now();
    if (jobId && now - lastFlush > 1500) {
      lastFlush = now;
      void writeJob({ status: 'running' });
    }
  }

  // Job kaydini baslat
  await writeJob({ status: 'running', result: null, error: null }, true);

  // ===== ERKEN BASLATILAN PARALEL ISLER (hic bir seye bagimli degil) =====
  const videoPromise = fetchBufferFromUrl(VIDEO_URL)
    .then((buf) => ({ ok: true as const, buf }))
    .catch((e: any) => ({ ok: false as const, err: (e.message || '').slice(0, 150) }));

  const bonusPromise = fetchBufferFromUrl(BONUS_IMAGE_URL)
    .then((buf) => ({ ok: true as const, buf }))
    .catch((e: any) => ({ ok: false as const, err: (e.message || '').slice(0, 150) }));

  const taxonomyPromise = findClipArtTaxonomyId().catch(() => null);

  const pdfTemplatePromise = (async () => {
    try {
      const r = await db
        .from('etsy_settings')
        .select('pdf_template_b64')
        .eq('id', 1)
        .single();
      return r.data;
    } catch (e) {
      return null;
    }
  })();

  try {
    const shopLabel = shopKey === 'shop2' ? 'SuzyCardPrints' : 'SuzyFlowArt';
    const productLabel = productType === 'line_art' ? 'Line Art' : 'Auto';
    log('[' + elapsed() + '] Shop: ' + shopLabel + ' | Tip: ' + productLabel);

    log('[' + elapsed() + '] Drive klasoru okunuyor');
    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) {
      await writeJob({ status: 'error', error: 'Klasorde resim bulunamadi. Herkese acik mi?' }, true);
      return NextResponse.json(
        { error: 'Klasorde resim bulunamadi. Herkese acik mi?', steps },
        { status: 400 }
      );
    }
    log('[' + elapsed() + '] ' + folder.imageCount + ' resim, PNG: ' + folder.hasPng + ', JPG: ' + folder.hasJpg + ', PDF: ' + folder.hasPdf + ', PNG subfolder: ' + folder.hasPngSubfolder);

    const top10 = folder.images.slice(0, 10);

    const analyzeBatch = await processBatch(
      top10.slice(0, 2),
      2,
      async (img) => downloadDriveFile(img.id)
    );
    const analyzeBuffers: Buffer[] = analyzeBatch.results.filter((b): b is Buffer => b !== null);
    log('[' + elapsed() + '] Analiz icin ' + analyzeBuffers.length + ' resim indirildi');

    const descBatch = await processBatch(
      analyzeBuffers,
      2,
      async (buf) => describeImageBuffer(buf)
    );
    const descs: string[] = descBatch.results.filter((d): d is string => d !== null && d.length > 3);

    if (descs.length === 0) {
      await writeJob({ status: 'error', error: 'Resimler analiz edilemedi.' }, true);
      return NextResponse.json(
        { error: 'Resimler analiz edilemedi.', steps },
        { status: 400 }
      );
    }
    log('[' + elapsed() + '] Gorseller analiz edildi: ' + descs[0].slice(0, 60));

    let folderNumber = '';
    let currentFolderName = '';
    try {
      const folderIdForName = folder.folderId;
      if (folderIdForName) {
        currentFolderName = await getDriveFolderName(folderIdForName);
        const numMatch = currentFolderName.match(/^(\d+)/);
        if (numMatch) {
          folderNumber = numMatch[1];
          log('[' + elapsed() + '] Klasor numarasi: ' + folderNumber);
        }
      }
    } catch (e: any) {
      log('Klasor adi okunamadi: ' + (e.message || 'bilinmeyen'));
    }

    const needsAllImages = generatePng || upscaleImages;
    const imagesToDownload = needsAllImages ? folder.images : top10;

    const allImageBuffers: Buffer[] = new Array(imagesToDownload.length).fill(null);

    for (let i = 0; i < analyzeBuffers.length && i < allImageBuffers.length; i++) {
      allImageBuffers[i] = analyzeBuffers[i];
    }

    const remainingIndices: number[] = [];
    for (let i = analyzeBuffers.length; i < imagesToDownload.length; i++) {
      remainingIndices.push(i);
    }

    if (remainingIndices.length > 0) {
      log('[' + elapsed() + '] ' + remainingIndices.length + ' resim paralel indiriliyor');
      const downloadBatch = await processBatch(
        remainingIndices,
        8,
        async (idx) => {
          const buf = await downloadDriveFile(imagesToDownload[idx].id);
          allImageBuffers[idx] = buf;
          return true;
        }
      );
      const dlCount = downloadBatch.results.filter((r) => r === true).length;
      log('[' + elapsed() + '] ' + dlCount + ' resim indirildi, ' + downloadBatch.errors + ' hata');
    }

    const downloadedCount = allImageBuffers.filter((b) => b !== null).length;
    log('[' + elapsed() + '] Toplam ' + downloadedCount + ' resim hazir');

    // ===== SEO + PNG PARALEL (birbirine bagimli degiller) =====
    // SEO icin PNG durumunu iyimser varsayiyoruz: kullanici PNG istediyse uretilecek
    const optimisticPngSubfolder = folder.hasPngSubfolder || generatePng;

    const seoPromise = generateEtsySeo({
      imageDescriptions: descs,
      fileCount: folder.imageCount,
      hasPdf: folder.hasPdf,
      hasPng: folder.hasPng,
      hasJpg: folder.hasJpg,
      hasPngSubfolder: optimisticPngSubfolder,
      folderNumber,
      productType,
    });

    const pngPromise = (async (): Promise<boolean> => {
      if (!generatePng) return false;
      log('[' + elapsed() + '] PNG uretimi baslatildi (SEO ile paralel)');
      try {
        const parentFolderId = folder.folderId;
        if (!parentFolderId) throw new Error('Folder ID yok');

        const pngFolderId = await oauthCreateOrGetSubfolder(parentFolderId, 'Png');
        log('[' + elapsed() + '] Png alt klasoru hazir');

        const validBuffers: { buf: Buffer; idx: number }[] = [];
        for (let i = 0; i < allImageBuffers.length; i++) {
          if (allImageBuffers[i]) validBuffers.push({ buf: allImageBuffers[i], idx: i });
        }

        const pngBatch = await processBatch(
          validBuffers,
          5,
          async (item) => {
            const pngBuf = await removeBackground(item.buf);
            const pngBaseName = buildBaseNameFromTitle('placeholder');
            const pngName = pngBaseName + (item.idx + 1) + '.png';
            await oauthUploadFileToDrive(pngFolderId, pngName, pngBuf, 'image/png');
            return true;
          }
        );
        const pngOk = pngBatch.results.filter((r) => r === true).length;
        log('[' + elapsed() + '] PNG sonuc: ' + pngOk + ' basarili, ' + pngBatch.errors + ' hatali');
        return pngOk > 0;
      } catch (pngErr: any) {
        log('PNG uretim HATASI: ' + (pngErr.message || 'bilinmeyen'));
        return false;
      }
    })();

    const [seo, pngGenerated] = await Promise.all([seoPromise, pngPromise]);
    log('[' + elapsed() + '] SEO uretildi: ' + seo.title.slice(0, 55));

    if (generatePng && !pngGenerated) {
      log('UYARI: PNG uretilemedi ama SEO PNG icerebilir - listing metnini kontrol et');
    }

    const finalHasPngSubfolder = folder.hasPngSubfolder || pngGenerated;

    const upscaledBuffers: Buffer[] = new Array(allImageBuffers.length).fill(null);
    let upscaleApplied = false;

    if (upscaleImages) {
      log('[' + elapsed() + '] Upscale baslatildi (paralel, 4032x4032)');
      try {
        const parentFolderId = folder.folderId;
        if (!parentFolderId) throw new Error('Folder ID yok');

        const baseName = buildBaseNameFromTitle(seo.title);
        log('[' + elapsed() + '] Yeni isim base: ' + baseName);

        const validBuffers: { buf: Buffer; idx: number }[] = [];
        for (let i = 0; i < allImageBuffers.length; i++) {
          if (allImageBuffers[i]) validBuffers.push({ buf: allImageBuffers[i], idx: i });
        }

        const upscaleErrors: string[] = [];
        const upscaleBatch = await processBatch(
          validBuffers,
          5,
          async (item) => {
            try {
              const bigBuf = await upscaleToJpeg(item.buf);
              upscaledBuffers[item.idx] = bigBuf;
              const newName = baseName + (item.idx + 1) + '.jpg';
              await oauthUploadFileToDrive(parentFolderId, newName, bigBuf, 'image/jpeg');
              return true;
            } catch (itemErr: any) {
              const msg = (itemErr.message || 'bilinmeyen').slice(0, 200);
              upscaleErrors.push('idx=' + item.idx + ' ' + msg);
              throw itemErr;
            }
          }
        );
        const upOk = upscaleBatch.results.filter((r) => r === true).length;
        log('[' + elapsed() + '] Upscale sonuc: ' + upOk + ' basarili, ' + upscaleBatch.errors + ' hatali');
        for (let ei = 0; ei < Math.min(3, upscaleErrors.length); ei++) {
          log('  - ' + upscaleErrors[ei]);
        }
        if (upscaleErrors.length > 3) {
          log('  - ... ve ' + (upscaleErrors.length - 3) + ' hata daha');
        }

        if (upOk === validBuffers.length) {
          try {
            const lowQualityFolderId = await serviceCreateOrGetSubfolder(parentFolderId, 'Low Quality');
            log('[' + elapsed() + '] Low Quality alt klasoru hazir');

            const moveBatch = await processBatch(
              folder.images,
              8,
              async (img) => {
                await serviceMoveFile(img.id, parentFolderId, lowQualityFolderId);
                return true;
              }
            );
            const mvOk = moveBatch.results.filter((r) => r === true).length;
            log('[' + elapsed() + '] Eski dosyalar tasindi: ' + mvOk + ' basarili, ' + moveBatch.errors + ' hatali');
            upscaleApplied = true;
          } catch (lqErr: any) {
            log('Low Quality klasor HATASI: ' + (lqErr.message || 'bilinmeyen'));
            upscaleApplied = true;
          }
        } else {
          log('UYARI: Upscale tam basarili degil, eski dosyalar tasinmadi');
        }
      } catch (upErr: any) {
        log('Upscale HATASI: ' + (upErr.message || 'bilinmeyen'));
      }
    }

    const taxonomyId = await taxonomyPromise;
    if (!taxonomyId) {
      throw new Error('Taxonomy alinamadi');
    }
    log('[' + elapsed() + '] Taxonomy: ' + taxonomyId);

    const isLineArt = productType === 'line_art';
    const listingId = await createDraftListing({
      title: seo.title,
      description: seo.description,
      tags: seo.tags,
      taxonomyId,
      materials: isLineArt
        ? ['digital file', 'ink', 'line art']
        : ['digital file', finalHasPngSubfolder ? 'png' : 'jpg', 'watercolor'],
      styles: isLineArt
        ? ['Minimalist', 'Whimsical']
        : ['Whimsical', 'Cottagecore'],
    }, shopKey);
    log('[' + elapsed() + '] Draft olusturuldu: ' + listingId);

    const propertyUpdates: Promise<void>[] = [];

    propertyUpdates.push(
      updateListingProperty(listingId, PROP_CRAFT, CRAFT_VALUES, CRAFT_NAMES, shopKey)
        .then((ok) => { log('Craft type: ' + (ok ? 'OK' : 'atlandi')); })
        .catch(() => { log('Craft type: hata'); })
    );

    const subj = SUBJECT_MAP[(seo.artSubject || '').toLowerCase().trim()];
    if (subj) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_SUBJECT, [subj], [seo.artSubject], shopKey)
          .then((ok) => { log('Art subject (' + seo.artSubject + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { log('Art subject: hata'); })
      );
    }

    const occ = OCCASION_MAP[(seo.occasion || '').toLowerCase().trim()];
    if (occ) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_OCCASION, [occ], [seo.occasion], shopKey)
          .then((ok) => { log('Occasion (' + seo.occasion + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { log('Occasion: hata'); })
      );
    }

    const hol = HOLIDAY_MAP[(seo.holiday || '').toLowerCase().trim()];
    if (hol) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_HOLIDAY, [hol], [seo.holiday], shopKey)
          .then((ok) => { log('Holiday (' + seo.holiday + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { log('Holiday: hata'); })
      );
    }

    await Promise.all(propertyUpdates);
    log('[' + elapsed() + '] Tum property update tamamlandi');

        // ===== ETSY RESIM UPLOAD - SIRALI (Etsy listing'i kilitler, paralel kabul etmez) =====
    log('[' + elapsed() + '] Etsy resim upload basliyor sirali (' + top10.length + ' resim)');

    let etsyImgSuccess = 0;
    let etsyImgFail = 0;
    const etsyErrors: string[] = [];

    const uploadIndices: number[] = [];
    for (let i = 0; i < top10.length; i++) uploadIndices.push(i);

    await processBatch(uploadIndices, 1, async (i) => {
      let buf: Buffer | null = null;

      if (upscaleApplied && upscaledBuffers[i]) {
        buf = upscaledBuffers[i];
      } else if (allImageBuffers[i]) {
        buf = allImageBuffers[i];
      } else {
        try {
          buf = await downloadDriveFile(top10[i].id);
        } catch (e: any) {
          etsyImgFail++;
          etsyErrors.push('Resim ' + (i + 1) + ' indirilemedi: ' + (e.message || '').slice(0, 80));
          return false;
        }
      }

      if (!buf) {
        etsyImgFail++;
        etsyErrors.push('Resim ' + (i + 1) + ' buffer yok');
        return false;
      }

      const alt = buildAltText(seo.altBase, i + 1, top10.length);
      const result = await uploadListingImageWithRetry(listingId, buf, i + 1, alt, shopKey, 3);

      if (result.success) {
        etsyImgSuccess++;
      } else {
        etsyImgFail++;
        etsyErrors.push('Resim ' + (i + 1) + ': ' + result.error.slice(0, 80));
      }
      return result.success;
    });

    log('[' + elapsed() + '] Etsy upload sonuc: ' + etsyImgSuccess + '/' + top10.length + ' basarili' + (upscaleApplied ? ' (4032x4032)' : ''));
    if (etsyImgFail > 0) {
      for (let i = 0; i < Math.min(3, etsyErrors.length); i++) {
        log('  - ' + etsyErrors[i]);
      }
      if (etsyErrors.length > 3) {
        log('  - ... ve ' + (etsyErrors.length - 3) + ' hata daha');
      }
    }

    // ===== 11. RESIM: BONUS PACK (erken indirilmisti) =====
    const bonusRes = await bonusPromise;
    if (bonusRes.ok) {
      const bonusAlt = '100 plus bonus pack included free gift watercolor clipart designs';
      const bonusResult = await uploadListingImageWithRetry(listingId, bonusRes.buf, 11, bonusAlt, shopKey, 3);
      if (bonusResult.success) {
        log('[' + elapsed() + '] 11. resim (Bonus Pack) yuklendi');
      } else {
        log('11. resim HATASI: ' + bonusResult.error);
      }
    } else {
      log('11. resim fetch HATASI: ' + bonusRes.err);
    }

    // ===== VIDEO (erken indirilmisti) =====
    const videoRes = await videoPromise;
    if (videoRes.ok) {
      try {
        log('[' + elapsed() + '] Video hazir: ' + Math.round(videoRes.buf.length / 1024) + ' KB');
        await uploadListingVideo(listingId, videoRes.buf, 'listing-video.mp4', shopKey);
        log('[' + elapsed() + '] Video Etsy\'ye yuklendi');
      } catch (videoErr: any) {
        log('Video HATASI: ' + (videoErr.message || 'bilinmeyen').slice(0, 200));
      }
    } else {
      log('Video fetch HATASI: ' + videoRes.err);
    }

    // ===== PDF (sablon erken cekilmisti) =====
    const tplRow = await pdfTemplatePromise;
    if (tplRow && tplRow.pdf_template_b64) {
      try {
        const tplBuf = Buffer.from(tplRow.pdf_template_b64, 'base64');
        const newPdf = await rewritePdfDownloadLink(tplBuf, driveUrl);
        await uploadListingFile(listingId, newPdf, 'download.pdf', shopKey);
        log('[' + elapsed() + '] PDF link degistirildi ve yuklendi');
      } catch (pdfErr: any) {
        log('PDF HATASI: ' + pdfErr.message);
      }
    } else {
      log('UYARI: PDF sablonu yok');
    }

    try {
      const folderId = extractFolderId(driveUrl);
      if (folderId) {
        const newFolderName = folderNumber
          ? folderNumber + ' - ' + seo.title
          : seo.title;
        await renameDriveFolder(folderId, newFolderName);
        log('[' + elapsed() + '] Drive klasor adi guncellendi');
      }
    } catch (renameErr: any) {
      log('Drive rename HATASI: ' + renameErr.message);
    }

    log('[' + elapsed() + '] TAMAMLANDI');

    const shopUrlSlug = shopKey === 'shop2' ? 'SuzyCardPrints' : 'me';
    const payload = {
      success: true,
      listingId,
      shop: shopKey === 'shop2' ? 'SuzyCardPrints' : 'SuzyFlowArt',
      etsyEditUrl: 'https://www.etsy.com/your/shops/' + shopUrlSlug + '/listing-editor/edit/' + listingId,
      seo,
      steps,
    };

    await writeJob({ status: 'done', result: payload }, true);
    return NextResponse.json(payload);
  } catch (err: any) {
    await writeJob({ status: 'error', error: err.message }, true);
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
