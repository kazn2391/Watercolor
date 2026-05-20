import { NextRequest, NextResponse } from 'next/server';
import { refreshNewListingsCache } from '@/lib/etsy-new-listings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = req.headers.get('authorization');
  const isVercelCron = authHeader === 'Bearer ' + cronSecret;
  const isManualCall = secret === cronSecret;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshNewListingsCache();
    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      total: result.total,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('refresh-new-listings error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error'
    }, { status: 500 });
  }
}
