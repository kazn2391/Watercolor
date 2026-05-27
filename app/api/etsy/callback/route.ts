import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  // State'ten shop bilgisini cikar: "shop1_xxxxx" veya "shop2_xxxxx"
  let rowId = 1;
  let shopName = 'SuzyFlowArt';
  if (state.startsWith('shop2_')) {
    rowId = 2;
    shopName = 'SuzyCardPrints';
  } else if (state.startsWith('shop1_')) {
    rowId = 1;
    shopName = 'SuzyFlowArt';
  }

  const db = supabaseAdmin();
  const { data: row } = await db.from('etsy_oauth').select('*').eq('id', rowId).single();
  if (!row || row.oauth_state !== state) {
    return NextResponse.json({ error: 'State mismatch - try authorize again' }, { status: 400 });
  }
  const redirectUri = SITE_URL + '/api/etsy/callback';
  const apiKey = process.env.ETSY_API_KEY || '';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    code: code,
    code_verifier: row.code_verifier || '',
  });
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const tokenData = await res.json();
  if (!res.ok || !tokenData.access_token) {
    return NextResponse.json(
      { error: 'Token exchange failed', detail: tokenData },
      { status: 500 }
    );
  }
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  await db.from('etsy_oauth').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    code_verifier: null,
    oauth_state: null,
    updated_at: new Date().toISOString(),
  }).eq('id', rowId);
  return new NextResponse(
    '<html><body style="font-family:sans-serif;text-align:center;padding:60px">' +
    '<h1>' + shopName + ' baglandi!</h1>' +
    '<p>Yetkilendirme basarili. Bu sekmeyi kapatabilirsin.</p>' +
    '</body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
}
