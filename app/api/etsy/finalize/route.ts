import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile, extractFolderId } from '@/lib/drive-reader';
import { renameDriveFolder } from '@/lib/drive-writer';
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

const ADMIN_PASSWORD = 'Kuzey2391';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('URL fetch failed: ' + res.status);
  return Buffer.from(await res.arrayBuffer());
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
  return variants[(rank - 1) % variants.length].slice(0, 250);
}

async function uploadListingImageWithRetry(
  listingId: number,
  buf: Buffer,
  rank: number,
  alt: string,
  shopKey: string,
  maxAttempts: number = 3
): Promise<{ success: boolean; error: string }> {
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await uploadListingImage(listingId, buf, rank, alt, shopKey);
      return { success: true, error: '' };
    } catch (e: any) {
      lastError = (e.message || 'bilinmeyen').slice(0, 150);
      if (attempt < maxAttempts) await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  return { success: false, error: lastError };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let jobId = '';
  try {
    const bodyJson = await req.json();
    jobId = String(bodyJson.jobId || '').slice(0, 60);
  } catch (e) {}
  if (!jobId) return NextResponse.json({ error: 'jobId gerekli' }, { status: 400 });

  const db = supabaseAdmin();

  // Kilit: ayni job icin ikinci finalize calismasin (duplicate draft onlemi)
  const { data: locked } = await db
    .from('etsy_jobs')
    .update({ status: 'finalizing_run', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'finalizing')
    .select('id, steps, stage1');

  if (!locked || locked.length === 0) {
    return NextResponse.json({ ok: false, note: 'Job bulunamadi veya zaten calisiyor' });
  }

  const row = locked[0] as any;
  const stage1 = row.stage1;
  if (!stage1 || !stage1.seo) {
    await db
      .from('etsy_jobs')
      .update({ status: 'error', error: 'stage1 verisi eksik', updated_at: new Date().toISOString() })
      .eq('id', jobId);
    return NextResponse.json({ error: 'stage1 verisi eksik' }, { status: 400 });
  }

  const steps: string[] = Array.isArray(row.steps) ? row.steps : [];
  const t0 = Date.now();
  const elapsed = () => Math.round((Date.now() - t0) / 1000) + 's';

  let lastFlush = 0;
  let flushEnabled = true;
  async function writeJob(patch: Record<string, any>) {
    try {
      await db
        .from('etsy_jobs')
        .update({
          steps: steps,
          updated_at: new Date().toISOString(),
          ...patch,
        })
        .eq('id', jobId);
    } catch (e) {}
  }
  function log(msg: string) {
    steps.push(msg);
    if (!flushEnabled) return;
    const now = Date.now();
    if (now - lastFlush > 1500) {
      lastFlush = now;
      void writeJob({ status: 'finalizing_run' });
    }
  }

  const {
    driveUrl,
    shopKey,
    productType,
    seo,
    folderNumber,
    upscaleApplied,
    baseName,
    finalHasPngSubfolder,
  } = stage1;

  // Uzun islemlerde updated_at donmasin diye kalp atisi
  const heartbeat = setInterval(() => {
    if (flushEnabled) void writeJob({ status: 'finalizing_run' });
  }, 20000);

  // Erken paralel isler
  const videoPromise = fetchBufferFromUrl(VIDEO_URL)
    .then((buf) => ({ ok: true as const, buf }))
    .catch((e: any) => ({ ok: false as const, err: (e.message || '').slice(0, 150) }));
  const bonusPromise = fetchBufferFromUrl(BONUS_IMAGE_URL)
    .then((buf) => ({ ok: true as const, buf }))
    .catch((e: any) => ({ ok: false as const, err: (e.message || '').slice(0, 150) }));
  const taxonomyPromise = findClipArtTaxonomyId().catch(() => null);
  const pdfTemplatePromise = (async () => {
    try {
      const r = await db.from('etsy_settings').select('pdf_template_b64').eq('id', 1).single();
      return r.data;
    } catch (e) {
      return null;
    }
  })();

  try {
    log('[' + elapsed() + '] ASAMA 2 basladi - Etsy islemleri');

    // Klasoru yeniden oku (upscale sonrasi guncel hal)
    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) throw new Error('Klasorde resim yok (asama 2)');

    // Top 10 secimi
    let top10 = folder.images.slice(0, 10);
    if (upscaleApplied && baseName) {
      const named = folder.images
        .filter((img: any) => img.name && img.name.startsWith(baseName))
        .map((img: any) => {
          const m = img.name.match(/(\d+)\.(jpe?g|png)$/i);
          return { img, n: m ? parseInt(m[1], 10) : 999999 };
        })
        .sort((a: any, b: any) => a.n - b.n)
        .map((x: any) => x.img);
      if (named.length >= Math.min(10, folder.imageCount)) {
        top10 = named.slice(0, 10);
      }
    }
    log('[' + elapsed() + '] ' + top10.length + ' resim secildi' + (upscaleApplied ? ' (4032 upscale)' : ''));

    // Resimleri indir
    const bufs: (Buffer | null)[] = new Array(top10.length).fill(null);
    await processBatch(top10, 4, async (img: any, i: number) => {
      bufs[i] = await downloadDriveFile(img.id);
      return true;
    });
    log('[' + elapsed() + '] ' + bufs.filter(Boolean).length + '/' + top10.length + ' resim indirildi');

    const taxonomyId = await taxonomyPromise;
    if (!taxonomyId) throw new Error('Taxonomy alinamadi');

    const isLineArt = productType === 'line_art';
    const listingId = await createDraftListing(
      {
        title: seo.title,
        description: seo.description,
        tags: seo.tags,
        taxonomyId,
        materials: isLineArt
          ? ['digital file', 'ink', 'line art']
          : ['digital file', finalHasPngSubfolder ? 'png' : 'jpg', 'watercolor'],
        styles: isLineArt ? ['Minimalist', 'Whimsical'] : ['Whimsical', 'Cottagecore'],
      },
      shopKey
    );
    log('[' + elapsed() + '] Draft olusturuldu: ' + listingId);

    const propertyUpdates: Promise<void>[] = [];
    propertyUpdates.push(
      updateListingProperty(listingId, PROP_CRAFT, CRAFT_VALUES, CRAFT_NAMES, shopKey)
        .then((ok) => {
          log('Craft type: ' + (ok ? 'OK' : 'atlandi'));
        })
        .catch(() => {
          log('Craft type: hata');
        })
    );
    const subj = SUBJECT_MAP[(seo.artSubject || '').toLowerCase().trim()];
    if (subj) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_SUBJECT, [subj], [seo.artSubject], shopKey)
          .then((ok) => {
            log('Art subject: ' + (ok ? 'OK' : 'atlandi'));
          })
          .catch(() => {
            log('Art subject: hata');
          })
      );
    }
    const occ = OCCASION_MAP[(seo.occasion || '').toLowerCase().trim()];
    if (occ) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_OCCASION, [occ], [seo.occasion], shopKey)
          .then((ok) => {
            log('Occasion: ' + (ok ? 'OK' : 'atlandi'));
          })
          .catch(() => {
            log('Occasion: hata');
          })
      );
    }
    const hol = HOLIDAY_MAP[(seo.holiday || '').toLowerCase().trim()];
    if (hol) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_HOLIDAY, [hol], [seo.holiday], shopKey)
          .then((ok) => {
            log('Holiday: ' + (ok ? 'OK' : 'atlandi'));
          })
          .catch(() => {
            log('Holiday: hata');
          })
      );
    }
    await Promise.all(propertyUpdates);
    log('[' + elapsed() + '] Property update tamam');

    // Etsy resim upload - SIRALI (Etsy paralel kabul etmiyor, listing kilitleniyor)
    let ok10 = 0;
    let fail10 = 0;
    const errs: string[] = [];
    for (let i = 0; i < top10.length; i++) {
      const buf = bufs[i];
      if (!buf) {
        fail10++;
        errs.push('Resim ' + (i + 1) + ' buffer yok');
        continue;
      }
      const alt = buildAltText(seo.altBase, i + 1, top10.length);
      const r = await uploadListingImageWithRetry(listingId, buf, i + 1, alt, shopKey, 3);
      if (r.success) {
        ok10++;
      } else {
        fail10++;
        errs.push('Resim ' + (i + 1) + ': ' + r.error.slice(0, 80));
      }
    }
    log('[' + elapsed() + '] Etsy upload: ' + ok10 + '/' + top10.length + ' basarili');
    for (let i = 0; i < Math.min(3, errs.length); i++) log('  - ' + errs[i]);

    const bonusRes = await bonusPromise;
    if (bonusRes.ok) {
      const r = await uploadListingImageWithRetry(
        listingId,
        bonusRes.buf,
        11,
        '100 plus bonus pack included free gift watercolor clipart designs',
        shopKey,
        3
      );
      log(r.success ? '[' + elapsed() + '] Bonus resim yuklendi' : 'Bonus resim HATASI: ' + r.error);
    }

    const videoRes = await videoPromise;
    if (videoRes.ok) {
      try {
        await uploadListingVideo(listingId, videoRes.buf, 'listing-video.mp4', shopKey);
        log('[' + elapsed() + '] Video yuklendi');
      } catch (e: any) {
        log('Video HATASI: ' + (e.message || '').slice(0, 150));
      }
    }

    const tplRow = await pdfTemplatePromise;
    if (tplRow && tplRow.pdf_template_b64) {
      try {
        const newPdf = await rewritePdfDownloadLink(
          Buffer.from(tplRow.pdf_template_b64, 'base64'),
          driveUrl
        );
        await uploadListingFile(listingId, newPdf, 'download.pdf', shopKey);
        log('[' + elapsed() + '] PDF yuklendi');
      } catch (e: any) {
        log('PDF HATASI: ' + (e.message || '').slice(0, 150));
      }
    }

    try {
      const folderId = extractFolderId(driveUrl);
      if (folderId) {
        await renameDriveFolder(folderId, folderNumber ? folderNumber + ' - ' + seo.title : seo.title);
        log('[' + elapsed() + '] Drive klasor adi guncellendi');
      }
    } catch (e: any) {
      log('Drive rename HATASI: ' + (e.message || '').slice(0, 100));
    }

    clearInterval(heartbeat);
    flushEnabled = false;
    steps.push('[' + elapsed() + '] TAMAMLANDI');
    // Ucusta olan flush yazimlarinin bitmesini bekle
    await new Promise((r) => setTimeout(r, 600));

    const shopUrlSlug = shopKey === 'shop2' ? 'SuzyCardPrints' : 'me';
    const payload = {
      success: true,
      listingId,
      shop: shopKey === 'shop2' ? 'SuzyCardPrints' : 'SuzyFlowArt',
      etsyEditUrl: 'https://www.etsy.com/your/shops/' + shopUrlSlug + '/listing-editor/edit/' + listingId,
      seo,
      steps,
    };
    await writeJob({ status: 'done', result: payload });
    return NextResponse.json(payload);
  } catch (err: any) {
    clearInterval(heartbeat);
    flushEnabled = false;
    await new Promise((r) => setTimeout(r, 600));
    await writeJob({ status: 'error', error: err.message });
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
