import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = 'Kuzey2391';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('etsy_jobs')
    .select('status, steps, result, error, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: 'not_found' });
  }

  return NextResponse.json({
    status: data.status,
    steps: data.steps || [],
    result: data.result || null,
    error: data.error || null,
    updatedAt: data.updated_at,
  });
}
