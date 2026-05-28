import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createPinterestPin } from '@/lib/pinterest-pin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const boardId = process.env.PINTEREST_DEFAULT_BOARD_ID;
  if (!boardId) {
    return NextResponse.json({ 
      error: 'PINTEREST_DEFAULT_BOARD_ID env eksik. /api/pinterest/boards ile id bulup ENV ekle.' 
    }, { status: 500 });
  }

  // Kaç pin atalım? (default 1, ?count=N ile override)
  const count = Math.min(parseInt(url.searchParams.get('count') || '1'), 10);

  const db = supabaseAdmin();

  // Henüz pinlenmemiş, hata vermemiş, aktif listingleri çek
  // Son denenenden son denenmemiş olana sıralı
  const { data: listings, error: fetchErr } = await db
    .from('listings')
    .select('id, slug, title, description, etsy_url, main_image_url, tags')
    .is('pinned_at', null)
    .is('pin_attempted_at', null)
    .eq('state', 'active')
    .not('main_image_url', 'is', null)
    .order('last_synced_at', { ascending: false })
    .limit(count);

  if (fetchErr) {
    return NextResponse.json({ error: 'DB fetch failed: ' + fetchErr.message }, { status: 500 });
  }

  if (!listings || listings.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'Pinlenecek listing yok (hepsi pinlenmiş veya hatalı).',
      pinned: 0,
    });
  }

  const results: any[] = [];

  for (const listing of listings) {
    // Pinterest description: title + clean description + tags
    const tagText = (listing.tags && listing.tags.length)
      ? '\n\n' + listing.tags.slice(0, 8).map((t: string) => '#' + t.replace(/\s+/g, '')).join(' ')
      : '';
    
    const cleanDesc = (listing.description || '').slice(0, 500).replace(/\s+/g, ' ').trim();
    const fullDesc = listing.title + '\n\n' + cleanDesc + tagText;

    const link = SITE_URL + '/listing/' + listing.slug;

    // pin_attempted_at önce işaretle (paralel cron'lar tekrar denemesin)
    await db.from('listings').update({
      pin_attempted_at: new Date().toISOString(),
    }).eq('id', listing.id);

    const pinResult = await createPinterestPin({
      boardId: boardId,
      title: listing.title,
      description: fullDesc,
      link: link,
      imageUrl: listing.main_image_url,
      altText: listing.title,
    });

    if (pinResult.success) {
      await db.from('listings').update({
        pinned_at: new Date().toISOString(),
        pinterest_pin_id: pinResult.pinId,
        pin_error: null,
      }).eq('id', listing.id);
      results.push({ id: listing.id, slug: listing.slug, status: 'pinned', pinId: pinResult.pinId });
    } else {
      await db.from('listings').update({
        pin_error: pinResult.error?.slice(0, 500),
      }).eq('id', listing.id);
      results.push({ id: listing.id, slug: listing.slug, status: 'error', error: pinResult.error });
    }

    // Pin'ler arası 2 saniye bekle (rate limit + doğal görünüm)
    await new Promise(r => setTimeout(r, 2000));
  }

  const successCount = results.filter(r => r.status === 'pinned').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    pinned: successCount,
    errors: errorCount,
    results: results,
  });
}
