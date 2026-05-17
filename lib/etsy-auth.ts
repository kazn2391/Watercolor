import { supabaseAdmin } from './supabase';

export async function getValidEtsyToken(): Promise<string> {
  const db = supabaseAdmin();
  const { data: row } = await db.from('etsy_oauth').select('*').eq('id', 1).single();

  if (!row || !row.access_token) {
    throw new Error('Etsy not connected. Run /api/etsy/authorize first.');
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt - now > bufferMs) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new Error('Token expired and no refresh token. Re-authorize.');
  }

  const apiKey = process.env.ETSY_API_KEY || '';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: apiKey,
    refresh_token: row.refresh_token,
  });

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const tokenData = await res.json();

  if (!res.ok || !tokenData.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(tokenData));
  }

  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await db.from('etsy_oauth').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || row.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

  return tokenData.access_token;
}

export function getEtsyApiKeyHeader(): string {
  const key = process.env.ETSY_API_KEY || '';
  const secret = process.env.ETSY_SHARED_SECRET || '';
  return secret ? key + ':' + secret : key;
}
