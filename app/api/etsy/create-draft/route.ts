import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile } from '@/lib/drive-reader';
import { generateEtsySeo } from '@/lib/ai-seo';
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
  'abstract & geometric': 2817, animal: 2558, 'anime & cartoon': 2559,
  'architecture & cityscape': 3641, 'beach & tropical': 406, 'comics & manga': 2562,
  'fantasy & sci fi': 421, fashion: 3691, flowers: 2952, 'food & drink': 425,
  'geography & locale': 2957, 'horror & gothic': 2953, 'humorous saying': 2954,
  'inspirational saying': 2955, 'landscape & scenery': 3644, 'love & friendship': 439,
  military: 2549, music: 442, nautical: 443, 'patriotic & flags': 447,
  'people & portrait': 3694, 'pet portrait': 2340, 'phrase & saying': 2962,
  'plants & trees': 2530, religious: 456, 'science & tech': 458,
  'sports & fitness': 461, 'stars & celestial': 2532, steampunk: 2533,
  'travel & transportation': 470, 'western & cowboy': 474, zodiac: 2534,
};

const OCCASION_MAP: Record<string, number> = {
  birthday: 19, anniversary: 12, 'baby shower': 13, wedding: 32,
  graduation: 24, engagement: 22, 'bridal shower': 20,
};

const HOLIDAY_MAP: Record<string, number> = {
  christmas: 35, easter: 37, halloween: 39, thanksgiving: 46,
  "valentine's day": 48, "mother's day": 43, "father's day": 38,
  "new year's": 44, "st patrick's day": 45,
};

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
  try {
    const bodyJson = await req.json();
    driveUrl = bodyJson.driveUrl || '';
  } catch (e) {
    return NextResponse.json({ error: 'driveUrl gerekli' }, { status: 400 });
  }
  if (!driveUrl) {
    return NextResponse.json({ error: 'driveUrl bos' }, { status: 400 });
  }

  const steps: string[] = [];
  try {
    steps.push('Drive klasoru okunuyor');
    const folder = await readDriveFolder(driveUrl);
    if (folder.imageCount === 0) {
      return NextResponse.json(
        { error: 'Klasorde resim bulunamadi. Herkese acik mi?', steps },
        { status: 400 }
      );
    }
    steps.push(folder.imageCount + ' resim, PNG: ' + folder.hasPng + ', JPG: ' + folder.hasJpg + ', PDF: ' + folder.hasPdf);

    const top10 = folder.images.slice(0, 10);

    const analyzeBuffers: Buffer[] = [];
    for (let i = 0; i < Math.min(2, top10.length); i++) {
      const b = await downloadDriveFile(top10[i].id);
      analyzeBuffers.push(b);
    }

    const descs: string[] = [];
    for (const b of analyzeBuffers) {
      try {
        const d = await describeImageBuffer(b);
        if (d && d.length > 3) descs.push(d);
      } catch (e: any) {
        steps.push('Resim analiz uyarisi: ' + (e.message || 'bilinmeyen'));
      }
    }

    if (descs.length === 0) {
      return NextResponse.json(
        { error: 'Resimler analiz edilemedi. Drive dosyalari gercekten resim mi ve herkese acik mi?', steps },
        { status: 400 }
      );
    }
    steps.push('Gorseller analiz edildi: ' + descs[0].slice(0, 60));

    const seo = await generateEtsySeo({
      imageDescriptions: descs,
      fileCount: folder.imageCount,
      hasPdf: folder.hasPdf,
      hasPng: folder.hasPng,
      hasJpg: folder.hasJpg,
    });
    steps.push('SEO uretildi: ' + seo.title.slice(0, 55));

    const taxonomyId = await findClipArtTaxonomyId();
    steps.push('Taxonomy: ' + taxonomyId);

    const listingId = await createDraftListing({
      title: seo.title,
      description: seo.description,
      tags: seo.tags,
      taxonomyId,
    });
    steps.push('Draft olusturuldu: ' + listingId);

    // Craft type (zorunlu, sabit 4 deger)
    const okCraft = await updateListingProperty(listingId, PROP_CRAFT, CRAFT_VALUES, CRAFT_NAMES);
    steps.push('Craft type: ' + (okCraft ? 'OK' : 'atlandi'));

    // Primary color
    const pc = COLOR_MAP[(seo.primaryColor || '').toLowerCase().trim()];
    if (pc) {
      const ok = await updateListingProperty(listingId, PROP_PRIMARY_COLOR, [pc], [seo.primaryColor]);
      steps.push('Primary color (' + seo.primaryColor + '): ' + (ok ? 'OK' : 'atlandi'));
    }

    // Secondary color
    const sc = COLOR_MAP[(seo.secondaryColor || '').toLowerCase().trim()];
    if (sc && sc !== pc) {
      const ok = await updateListingProperty(listingId, PROP_SECONDARY_COLOR, [sc], [seo.secondaryColor]);
      steps.push('Secondary color (' + seo.secondaryColor + '): ' + (ok ? 'OK' : 'atlandi'));
    }

    // Art subject
    const subj = SUBJECT_MAP[(seo.artSubject || '').toLowerCase().trim()];
    if (subj) {
      const ok = await updateListingProperty(listingId, PROP_SUBJECT, [subj], [seo.artSubject]);
      steps.push('Art subject (' + seo.artSubject + '): ' + (ok ? 'OK' : 'atlandi'));
    }

    // Occasion (sadece belirgin ise)
    const occ = OCCASION_MAP[(seo.occasion || '').toLowerCase().trim()];
    if (occ) {
      const ok = await updateListingProperty(listingId, PROP_OCCASION, [occ], [seo.occasion]);
      steps.push('Occasion (' + seo.occasion + '): ' + (ok ? 'OK' : 'atlandi'));
    }

    // Holiday (sadece belirgin ise)
    const hol = HOLIDAY_MAP[(seo.holiday || '').toLowerCase().trim()];
    if (hol) {
      const ok = await updateListingProperty(listingId, PROP_HOLIDAY, [hol], [seo.holiday]);
      steps.push('Holiday (' + seo.holiday + '): ' + (ok ? 'OK' : 'atlandi'));
    }

    for (let i = 0; i < top10.length; i++) {
      let buf: Buffer;
      if (i < analyzeBuffers.length) {
        buf = analyzeBuffers[i];
      } else {
        buf = await downloadDriveFile(top10[i].id);
      }
      const alt = buildAltText(seo.altBase, i + 1, top10.length);
      await uploadListingImage(listingId, buf, i + 1, alt);
    }
    steps.push(top10.length + ' resim + alt text yuklendi');

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
        steps.push('PDF link degistirildi ve yuklendi');
      } catch (pdfErr: any) {
        steps.push('PDF HATASI: ' + pdfErr.message);
      }
    } else {
      steps.push('UYARI: PDF sablonu yok');
    }

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
