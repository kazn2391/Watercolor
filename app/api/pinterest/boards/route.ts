import { NextResponse } from 'next/server';
import { listPinterestBoards } from '@/lib/pinterest-pin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const boards = await listPinterestBoards();
    return NextResponse.json({
      count: boards.length,
      boards: boards.map((b: any) => ({
        id: b.id,
        name: b.name,
        privacy: b.privacy,
        pin_count: b.pin_count,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
