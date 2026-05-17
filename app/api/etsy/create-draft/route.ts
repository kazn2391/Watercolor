import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readDriveFolder, downloadDriveFile, getDriveThumbnail } from '@/lib/drive-reader';
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

async function describeImage(b64: string): Promise<string> {
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
            { type: 'text', text: 'Describe this clipart design in one short phrase: subject, style, colors, theme. Max 15 words.' },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) return 'watercolor clipart design';
  let t = '';
  for (const b of data.content || []) if (b.type === 'text') t += b.text;
  return t.trim().slice(0, 120);
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
    const descs: string[] = [];
    for (const img of top10.slice(0, 4)) {
      try {
        const thumb = await getDriveThumbnail(img.id);
        const d = await describeImage(thumb);
        descs.push(d);
      } catch (e) {
        descs.push('watercolor clipart');
      }
    }
    steps.push('Gorseller analiz edildi');

    const seo = await generateEtsySeo({
      imageDescriptions: descs,
      fileCount: folder.imageCount,
      hasPdf: folder.hasPdf,
    });
    steps.push('SEO uretildi: ' + seo.title.slice(0, 50));

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
      const buf = await downloadDriveFile(top10[i].id);
      await uploadListingImage(listingId, buf, i + 1);
    }
    steps.push(top10.length + ' resim yuklendi');

    const db = supabaseAdmin();
    const { data: tplRow } = await db
      .from('etsy_settings')
      .select('pdf_template_b64')
      .eq('id', 1)
      .single();

    if (tplRow && tplRow.pdf_template_b64) {
      const tplBuf = Buffer.from(tplRow.pdf_template_b64, 'base64');
      const newPdf = await rewritePdfDownloadLink(tplBuf, driveUrl);
      await uploadListingFile(listingId, newPdf, 'download.pdf');
      steps.push('PDF (link degistirildi) yuklendi');
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
