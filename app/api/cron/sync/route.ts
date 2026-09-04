import { NextResponse } from 'next/server';
import { fullSync } from '@/lib/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const secretParam = url.searchParams.get('secret');

  const isVercelCron = auth === 'Bearer ' + cronSecret;
  const isManualCall = !!cronSecret && secretParam === cronSecret;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

  try {
    const result = await fullSync(offset);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
