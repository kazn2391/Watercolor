import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: 'Pinterest auth denied: ' + error }, { status: 400 });
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: row } = await db.from('pinterest_oauth').select('*').eq('id', 1).single();

  if (!row || row.oauth_state !== state) {
    return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
  }

  const appId = process.env.PINTEREST_APP_ID || '';
  const appSecret = process.env.PINTEREST_APP_SECRET || '';
  const basicAuth = Buffer.from(appId + ':' + appSecret).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: SITE_URL + '/api/pinterest/callback',
    code_verifier: row.code_verifier || '',
  });

  const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.json({
      error: 'Token exchange failed',
      details: tokenData,
    }, { status: 400 });
  }

  let userId = '';
  let username = '';
  try {
    const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
    });
    const userData = await userRes.json();
    userId = userData.id || '';
    username = userData.username || '';
  } catch (e) {}

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 2592000) * 1000).toISOString();

  await db.from('pinterest_oauth').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    expires_at: expiresAt,
    pinterest_user_id: userId,
    pinterest_username: username,
    oauth_state: null,
    code_verifier: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

  return NextResponse.json({
    success: true,
    username: username,
    message: 'Pinterest baglandi. Token kaydedildi.',
  });
}
