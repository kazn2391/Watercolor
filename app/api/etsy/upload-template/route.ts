import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('pdf') as File;
    if (!file) {
      return NextResponse.json({ error: 'pdf dosyasi gerekli' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString('base64');

    const db = supabaseAdmin();
    const { error } = await db
      .from('etsy_settings')
      .update({ pdf_template_b64: b64, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sizeKb: Math.round(b64.length / 1024),
      message: 'PDF sablonu kaydedildi',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
