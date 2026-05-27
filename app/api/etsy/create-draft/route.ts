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
  findClipArtTaxonomyId,
  updateListingProperty,
} from '@/lib/etsy-listing';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const PROP_CRAFT = 47626759760;
const PROP_PRIMARY_COLOR = 200;
const PROP_SECONDARY_COLOR = 52047899002;
const PROP_OCCASION = 46803063641;
const PROP_HOLIDAY = 46803063659;
const PROP_SUBJECT = 400394338806;

const CRAFT_VALUES = [538, 541, 562, 584];
const CRAFT_NAMES = ['Card making & stationery', 'Collage', "Kids' crafts", 'Scrapbooking'];

const COLOR_MAP: Record<string, number> = {
  beige: 1213, black: 1, blue: 2, bronze: 1216, brown: 3, clear: 1219,
  copper: 1218, gold: 1214, gray: 5, green: 4, orange: 6, pink: 7,
  purple: 8, rainbow: 1220, red: 9, 'rose gold': 1217, silver: 1215,
  white: 10, yellow: 11,
};

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

// Paralel batch islem icin yardimci - concurrency limit ile array islem
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

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let driveUrl = '';
  let generatePng = false;
  let upscaleImages = false;
  try {
    const bodyJson = await req.json();
    driveUrl = bodyJson.driveUrl || '';
    generatePng = bodyJson.generatePng === true;
    upscaleImages = bodyJson.upscaleImages === true;
  } catch (e) {
    return NextResponse.json({ error: 'driveUrl gerekli' }, { status: 400 });
  }
  if (!driveUrl) {
    return NextResponse.json({ error: 'driveUrl bos' }, { status: 400 });
  }

  const steps: string[] = [];
  const t0 = Date.now();
  const elapsed = () => Math.round((Date.now() - t0) / 1000) + 's';

  try {
    steps.push('[' + elapsed() + '] Drive klasoru okunuyor');
    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) {
      return NextResponse.json(
        { error: 'Klasorde resim bulunamadi. Herkese acik mi?', steps },
        { status: 400 }
      );
    }
    steps.push('[' + elapsed() + '] ' + folder.imageCount + ' resim, PNG: ' + folder.hasPng + ', JPG: ' + folder.hasJpg + ', PDF: ' + folder.hasPdf + ', PNG subfolder: ' + folder.hasPngSubfolder);

    const top10 = folder.images.slice(0, 10);

    // PARALEL: Ilk 2 resmi analiz icin paralel indir
    const analyzeBatch = await processBatch(
      top10.slice(0, 2),
      2,
      async (img) => downloadDriveFile(img.id)
    );
    const analyzeBuffers: Buffer[] = analyzeBatch.results.filter((b): b is Buffer => b !== null);
    steps.push('[' + elapsed() + '] Analiz icin ' + analyzeBuffers.length + ' resim indirildi');

    // PARALEL: 2 resmi paralel analiz et
    const descBatch = await processBatch(
      analyzeBuffers,
      2,
      async (buf) => describeImageBuffer(buf)
    );
    const descs: string[] = descBatch.results.filter((d): d is string => d !== null && d.length > 3);

    if (descs.length === 0) {
      return NextResponse.json(
        { error: 'Resimler analiz edilemedi. Drive dosyalari gercekten resim mi ve herkese acik mi?', steps },
        { status: 400 }
      );
    }
    steps.push('[' + elapsed() + '] Gorseller analiz edildi: ' + descs[0].slice(0, 60));

    let folderNumber = '';
    let currentFolderName = '';
    try {
      const folderIdForName = folder.folderId;
      if (folderIdForName) {
        currentFolderName = await getDriveFolderName(folderIdForName);
        const numMatch = currentFolderName.match(/^(\d+)/);
        if (numMatch) {
          folderNumber = numMatch[1];
          steps.push('[' + elapsed() + '] Klasor numarasi: ' + folderNumber);
        }
      }
    } catch (e: any) {
      steps.push('Klasor adi okunamadi: ' + (e.message || 'bilinmeyen'));
    }

    // PARALEL: Tum kalan resimleri paralel indir (eger gerekiyorsa)
    const allImageBuffers: Buffer[] = [...analyzeBuffers];
    const needsAllBuffers = generatePng || upscaleImages || folder.images.length > top10.length;

    if (needsAllBuffers && folder.images.length > analyzeBuffers.length) {
      const remainingImages = folder.images.slice(analyzeBuffers.length);
      steps.push('[' + elapsed() + '] ' + remainingImages.length + ' resim paralel indiriliyor');
      const downloadBatch = await processBatch(
        remainingImages,
        5,
        async (img) => downloadDriveFile(img.id)
      );
      for (const buf of downloadBatch.results) {
        if (buf) allImageBuffers.push(buf);
      }
      steps.push('[' + elapsed() + '] Toplam ' + allImageBuffers.length + ' resim hazir');
    }

    // PARALEL: PNG uretimi
    let pngGenerated = false;
    if (generatePng) {
      steps.push('[' + elapsed() + '] PNG uretimi baslatildi (paralel)');
      try {
        const parentFolderId = folder.folderId;
        if (!parentFolderId) throw new Error('Folder ID yok');

        const pngFolderId = await oauthCreateOrGetSubfolder(parentFolderId, 'Png');
        steps.push('[' + elapsed() + '] Png alt klasoru hazir');

        // PARALEL: 5 concurrent Photoroom call + upload
        const pngBatch = await processBatch(
          allImageBuffers,
          5,
          async (buf, i) => {
            const pngBuf = await removeBackground(buf);
            const originalName = folder.images[i] ? folder.images[i].name : 'image' + (i + 1);
            const baseName = originalName.replace(/\.(jpg|jpeg|png)$/i, '');
            const pngName = baseName + '.png';
            await oauthUploadFileToDrive(pngFolderId, pngName, pngBuf, 'image/png');
            return true;
          }
        );
        const pngSuccessCount = pngBatch.results.filter((r) => r === true).length;
        steps.push('[' + elapsed() + '] PNG sonuc: ' + pngSuccessCount + ' basarili, ' + pngBatch.errors + ' hatali');
        if (pngSuccessCount > 0) pngGenerated = true;
      } catch (pngErr: any) {
        steps.push('PNG uretim HATASI: ' + (pngErr.message || 'bilinmeyen'));
      }
    }

    const finalHasPngSubfolder = folder.hasPngSubfolder || pngGenerated;

    const seo = await generateEtsySeo({
      imageDescriptions: descs,
      fileCount: folder.imageCount,
      hasPdf: folder.hasPdf,
      hasPng: folder.hasPng,
      hasJpg: folder.hasJpg,
      hasPngSubfolder: finalHasPngSubfolder,
      folderNumber,
    });
    steps.push('[' + elapsed() + '] SEO uretildi: ' + seo.title.slice(0, 55));

    // PARALEL: UPSCALE
    let upscaledBuffers: Buffer[] = new Array(allImageBuffers.length).fill(null);
    let upscaleApplied = false;

    if (upscaleImages) {
      steps.push('[' + elapsed() + '] Upscale baslatildi (paralel, 4032x4032)');
      try {
        const parentFolderId = folder.folderId;
        if (!parentFolderId) throw new Error('Folder ID yok');

        const baseName = buildBaseNameFromTitle(seo.title);
        steps.push('[' + elapsed() + '] Yeni isim base: ' + baseName);

        // PARALEL: 5 concurrent upscale + upload
        const upscaleBatch = await processBatch(
          allImageBuffers,
          5,
          async (buf, i) => {
            const bigBuf = await upscaleToJpeg(buf);
            upscaledBuffers[i] = bigBuf;
            const newName = baseName + (i + 1) + '.jpg';
            await oauthUploadFileToDrive(parentFolderId, newName, bigBuf, 'image/jpeg');
            return bigBuf;
          }
        );
        const upscaleSuccessCount = upscaleBatch.results.filter((r) => r !== null).length;
        steps.push('[' + elapsed() + '] Upscale sonuc: ' + upscaleSuccessCount + ' basarili, ' + upscaleBatch.errors + ' hatali');

        // PARALEL: Eski dosyalari "Low Quality" alt klasorune tasi
        if (upscaleSuccessCount === allImageBuffers.length) {
          try {
            const lowQualityFolderId = await serviceCreateOrGetSubfolder(parentFolderId, 'Low Quality');
            steps.push('[' + elapsed() + '] Low Quality alt klasoru hazir');

            // PARALEL: 5 concurrent move
            const moveBatch = await processBatch(
              folder.images,
              5,
              async (img) => {
                await serviceMoveFile(img.id, parentFolderId, lowQualityFolderId);
                return true;
              }
            );
            const moveSuccessCount = moveBatch.results.filter((r) => r === true).length;
            steps.push('[' + elapsed() + '] Eski dosyalar tasindi: ' + moveSuccessCount + ' basarili, ' + moveBatch.errors + ' hatali');
            upscaleApplied = true;
          } catch (lqErr: any) {
            steps.push('Low Quality klasor HATASI: ' + (lqErr.message || 'bilinmeyen'));
            upscaleApplied = true;
          }
        } else {
          steps.push('UYARI: Upscale tam basarili degil, eski dosyalar tasinmadi');
        }
      } catch (upErr: any) {
        steps.push('Upscale HATASI: ' + (upErr.message || 'bilinmeyen'));
      }
    }

    const taxonomyId = await findClipArtTaxonomyId();
    steps.push('[' + elapsed() + '] Taxonomy: ' + taxonomyId);

    const listingId = await createDraftListing({
      title: seo.title,
      description: seo.description,
      tags: seo.tags,
      taxonomyId,
    });
    steps.push('[' + elapsed() + '] Draft olusturuldu: ' + listingId);

    // PARALEL: Etsy property updates (her biri ayri request, paralel olabilir)
    const propertyUpdates: Promise<void>[] = [];

    propertyUpdates.push(
      updateListingProperty(listingId, PROP_CRAFT, CRAFT_VALUES, CRAFT_NAMES)
        .then((ok) => { steps.push('Craft type: ' + (ok ? 'OK' : 'atlandi')); })
        .catch(() => { steps.push('Craft type: hata'); })
    );

    const pc = COLOR_MAP[(seo.primaryColor || '').toLowerCase().trim()];
    if (pc) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_PRIMARY_COLOR, [pc], [seo.primaryColor])
          .then((ok) => { steps.push('Primary color (' + seo.primaryColor + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { steps.push('Primary color: hata'); })
      );
    }

    const sc = COLOR_MAP[(seo.secondaryColor || '').toLowerCase().trim()];
    if (sc && sc !== pc) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_SECONDARY_COLOR, [sc], [seo.secondaryColor])
          .then((ok) => { steps.push('Secondary color (' + seo.secondaryColor + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { steps.push('Secondary color: hata'); })
      );
    }

    const subj = SUBJECT_MAP[(seo.artSubject || '').toLowerCase().trim()];
    if (subj) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_SUBJECT, [subj], [seo.artSubject])
          .then((ok) => { steps.push('Art subject (' + seo.artSubject + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { steps.push('Art subject: hata'); })
      );
    }

    const occ = OCCASION_MAP[(seo.occasion || '').toLowerCase().trim()];
    if (occ) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_OCCASION, [occ], [seo.occasion])
          .then((ok) => { steps.push('Occasion (' + seo.occasion + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { steps.push('Occasion: hata'); })
      );
    }

    const hol = HOLIDAY_MAP[(seo.holiday || '').toLowerCase().trim()];
    if (hol) {
      propertyUpdates.push(
        updateListingProperty(listingId, PROP_HOLIDAY, [hol], [seo.holiday])
          .then((ok) => { steps.push('Holiday (' + seo.holiday + '): ' + (ok ? 'OK' : 'atlandi')); })
          .catch(() => { steps.push('Holiday: hata'); })
      );
    }

    await Promise.all(propertyUpdates);
    steps.push('[' + elapsed() + '] Tum property update tamamlandi');

    // PARALEL: Etsy resim upload
    const etsyImageBatch = await processBatch(
      top10,
      3,
      async (img, i) => {
        let buf: Buffer;
        if (upscaleApplied && upscaledBuffers[i]) {
          buf = upscaledBuffers[i];
        } else if (i < allImageBuffers.length) {
          buf = allImageBuffers[i];
        } else {
          buf = await downloadDriveFile(img.id);
        }
        const alt = buildAltText(seo.altBase, i + 1, top10.length);
        await uploadListingImage(listingId, buf, i + 1, alt);
        return true;
      }
    );
    const etsyImgSuccess = etsyImageBatch.results.filter((r) => r === true).length;
    steps.push('[' + elapsed() + '] ' + etsyImgSuccess + ' resim + alt text yuklendi' + (upscaleApplied ? ' (4032x4032)' : ''));

    // PDF upload (kucuk, paralele gerek yok)
    const db = supabaseAdmin();
    const { data: tplRow } = await db
      .from('etsy_settings')
      .select('pdf_template_b64')
      .eq('id', 1)
      .single();

    if (tplRow && tplRow.pdf_template_b64) {
      try {
        const tplBuf = Buffer.from(tplRow.pdf_template_b64, 'base64');
        const newPdf = await rewritePdfDownloadLink(tplBuf, driveUrl);
        await uploadListingFile(listingId, newPdf, 'download.pdf');
        steps.push('[' + elapsed() + '] PDF link degistirildi ve yuklendi');
      } catch (pdfErr: any) {
        steps.push('PDF HATASI: ' + pdfErr.message);
      }
    } else {
      steps.push('UYARI: PDF sablonu yok');
    }

    // Drive klasor adi degistir
    try {
      const folderId = extractFolderId(driveUrl);
      if (folderId) {
        const newFolderName = folderNumber
          ? folderNumber + ' - ' + seo.title
          : seo.title;
        await renameDriveFolder(folderId, newFolderName);
        steps.push('[' + elapsed() + '] Drive klasor adi guncellendi');
      }
    } catch (renameErr: any) {
      steps.push('Drive rename HATASI: ' + renameErr.message);
    }

    steps.push('[' + elapsed() + '] TAMAMLANDI');

    return NextResponse.json({
      success: true,
      listingId,
      etsyEditUrl: 'https://www.etsy.com/your/shops/me/listing-editor/edit/' + listingId,
      seo,
      steps,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
