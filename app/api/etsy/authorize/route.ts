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

  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const state = base64url(randomBytes(16));

  const db = supabaseAdmin();
  await db.from('etsy_oauth').update({
    code_verifier: codeVerifier,
    oauth_state: state,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

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
