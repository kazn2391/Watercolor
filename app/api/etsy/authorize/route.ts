import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shopParam = url.searchParams.get('shop') || '1';
  const rowId = shopParam === '2' ? 2 : 1;

  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const state = 'shop' + rowId + '_' + base64url(randomBytes(16));

  const db = supabaseAdmin();

  // Her deneme KENDI satirini alir - cift tetikleme birbirini ezmez
  await db.from('etsy_oauth_pending').insert({
    state,
    row_id: rowId,
    code_verifier: codeVerifier,
  });

  // 1 saatten eski bekleyenleri temizle
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await db.from('etsy_oauth_pending').delete().lt('created_at', cutoff);

  const redirectUri = SITE_URL + '/api/etsy/callback';

  // listings_r/listings_w: draft olusturma ve listing okuma (mevcut, korunuyor)
  // shops_r/shops_w: shop endpointleri - senkron icin gerekli
  // email_r: /users/me teshis cagrisi icin
  const scope = 'listings_r listings_w shops_r shops_w email_r';

  const apiKey = process.env.ETSY_API_KEY || '';

  const authUrl =
    'https://www.etsy.com/oauth/connect?response_type=code' +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scope) +
    '&client_id=' + encodeURIComponent(apiKey) +
    '&state=' + encodeURIComponent(state) +
    '&code_challenge=' + encodeURIComponent(codeChallenge) +
    '&code_challenge_method=S256';

  return NextResponse.redirect(authUrl);
}
