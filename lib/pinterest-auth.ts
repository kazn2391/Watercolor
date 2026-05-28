import { supabaseAdmin } from './supabase';

export async function getValidPinterestToken(): Promise<string> {
  const db = supabaseAdmin();
  const { data: row } = await db.from('pinterest_oauth').select('*').eq('id', 1).single();

  if (!row || !row.access_token) {
    throw new Error('Pinterest not connected. Run /api/pinterest/authorize first.');
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt - now > bufferMs) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new Error('Pinterest token expired and no refresh token. Re-authorize.');
  }

  const appId = process.env.PINTEREST_APP_ID || '';
  const appSecret = process.env.PINTEREST_APP_SECRET || '';
  const basicAuth = Buffer.from(appId + ':' + appSecret).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: row.refresh_token,
  });

  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const tokenData = await res.json();
  if (!res.ok || !tokenData.access_token) {
    throw new Error('Pinterest token refresh failed: ' + JSON.stringify(tokenData));
  }

  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 2592000) * 1000).toISOString();

  await db.from('pinterest_oauth').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || row.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

  return tokenData.access_token;
}
