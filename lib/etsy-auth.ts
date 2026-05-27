import { supabaseAdmin } from './supabase';

/**
 * shopKey: 'shop1' (SuzyFlowArt, default) veya 'shop2' (SuzyCardPrints)
 * Aynı API key/secret kullaniliyor cunku tek app, ama refresh token farkli.
 */
export async function getValidEtsyToken(shopKey: string = 'shop1'): Promise<string> {
  const rowId = shopKey === 'shop2' ? 2 : 1;
  const db = supabaseAdmin();
  const { data: row } = await db.from('etsy_oauth').select('*').eq('id', rowId).single();
  if (!row || !row.access_token) {
    throw new Error('Etsy ' + shopKey + ' not connected. Run /api/etsy/authorize?shop=' + (rowId === 2 ? '2' : '1') + ' first.');
  }
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;
  if (expiresAt - now > bufferMs) {
    return row.access_token;
  }
  if (!row.refresh_token) {
    throw new Error('Token expired and no refresh token for ' + shopKey + '. Re-authorize.');
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
    throw new Error('Token refresh failed for ' + shopKey + ': ' + JSON.stringify(tokenData));
  }
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  await db.from('etsy_oauth').update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || row.refresh_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', rowId);
  return tokenData.access_token;
}

export function getEtsyApiKeyHeader(): string {
  const key = process.env.ETSY_API_KEY || '';
  const secret = process.env.ETSY_SHARED_SECRET || '';
  return secret ? key + ':' + secret : key;
}

/**
 * Shop key'e gore dogru shop ID'sini doner.
 */
export function getEtsyShopId(shopKey: string = 'shop1'): string {
  if (shopKey === 'shop2') {
    return process.env.ETSY2_SHOP_ID || '1168041937';
  }
  return process.env.ETSY_SHOP_ID || '49999102';
}
