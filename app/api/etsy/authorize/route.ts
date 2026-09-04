import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';
const PENDING_WINDOW_MS = 10 * 60 * 1000; // 10 dk

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Shop parametresi: ?shop=2 SuzyCardPrints, ?shop=1 (veya yok) SuzyFlowArt
  const shopParam = url.searchParams.get('shop') || '1';
  const rowId = shopParam === '2' ? 2 : 1;

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from('etsy_oauth')
    .select('code_verifier, oauth_state, updated_at')
    .eq('id', rowId)
    .single();

  let codeVerifier: string;
  let state: string;

  // IDEMPOTENT: bekleyen taze bir yetkilendirme varsa AYNISINI kullan.
  // Boylece authorize iki kez tetiklense bile (tarayici prefetch, cift tik)
  // ayni state + ayni verifier uretilir, state mismatch olusmaz.
  const pendingAge = existing?.updated_at
    ? Date.now() - new Date(existing.updated_at).getTime()
    : Number.MAX_SAFE_INTEGER;

  const canReuse =
    !!existing?.code_verifier &&
    !!existing?.oauth_state &&
    existing.oauth_state.startsWith('shop' + rowId + '_') &&
    pendingAge < PENDING_WINDOW_MS;

  if (canReuse) {
    codeVerifier = existing!.code_verifier as string;
    state = existing!.oauth_state as string;
  } else {
    codeVerifier = base64url(randomBytes(32));
    state = 'shop' + rowId + '_' + base64url(randomBytes(16));

    await db.from('etsy_oauth').update({
      code_verifier: codeVerifier,
      oauth_state: state,
      updated_at: new Date().toISOString(),
    }).eq('id', rowId);
  }

  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const redirectUri = SITE_URL + '/api/etsy/callback';
  const scope = 'listings_r listings_w';
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
