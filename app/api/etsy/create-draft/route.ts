import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile } from '@/lib/drive-reader';
import { generateEtsySeo } from '@/lib/ai-seo';
import { rewritePdfDownloadLink } from '@/lib/pdf-rewrite';
import {
  createDraftListing,
  uploadListingImage,
  uploadListingFile,
  findClipArtTaxonomyId,
} from '@/lib/etsy-listing';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

async function describeImageBuffer(buf: Buffer): Promise<string> {
  const b64 = buf.toString('base64');
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
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
            { type: 'text', text: 'Describe this clipart design in one short phrase. Name the exact subject (for example: cats, flowers, teacher theme, coffee cups), the art style, and main colors. Max 15 words. Be specific about the subject.' },
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
    altBase + ' high resolution transparent PNG clipart',
    altBase + ' printable digital download design',
    altBase + ' for crafts cards and scrapbooking',
    altBase + ' commercial use clipart set',
    altBase + ' watercolor style design element',
    altBase + ' transparent background PNG file',
    altBase + ' digital art for sublimation and print',
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
    steps.push(folder.imageCount + ' resim, PDF: ' + folder.hasPdf);

    const top10 = folder.images.slice(0, 10);

    // Ilk 2 resmin gercek dosyasini indirip AI'a gonder
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
