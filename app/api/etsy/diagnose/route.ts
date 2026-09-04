import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getEtsyApiKeyHeader, getEtsyShopId } from '@/lib/etsy-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || url.searchParams.get('key') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rowId = url.searchParams.get('shop') === '2' ? 2 : 1;
  const shopKey = rowId === 2 ? 'shop2' : 'shop1';
  const shopId = getEtsyShopId(shopKey);
  const out: any = { shopKey, shopId, steps: [] };

  const db = supabaseAdmin();
  const { data: row } = await db.from('etsy_oauth').select('*').eq('id', rowId).single();

  if (!row) {
    return NextResponse.json({ ...out, error: 'row yok' });
  }

  const at = String(row.access_token || '');
  const rt = String(row.refresh_token || '');
  out.db = {
    access_token_uzunluk: at.length,
    access_token_onek: at.slice(0, 12),
    refresh_token_uzunluk: rt.length,
    refresh_token_onek: rt.slice(0, 12),
    expires_at: row.expires_at,
    updated_at: row.updated_at,
    simdi: new Date().toISOString(),
  };

  out.env = {
    api_key_uzunluk: (process.env.ETSY_API_KEY || '').length,
    secret_var: !!process.env.ETSY_SHARED_SECRET,
    gonderilen_x_api_key_uzunluk: getEtsyApiKeyHeader().length,
  };

  // 1) DB'deki token ile basit bir cagri
  try {
    const r = await fetch('https://api.etsy.com/v3/application/users/me', {
      headers: {
        'x-api-key': getEtsyApiKeyHeader(),
        Authorization: 'Bearer ' + at,
      },
    });
    out.steps.push({ test: 'DB token ile /users/me', status: r.status, body: (await r.text()).slice(0, 300) });
  } catch (e: any) {
    out.steps.push({ test: 'DB token ile /users/me', hata: e.message });
  }

  // 2) Sadece api key ile (OAuth'suz)
  try {
    const r = await fetch(
      'https://api.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=1',
      { headers: { 'x-api-key': getEtsyApiKeyHeader() } }
    );
    out.steps.push({ test: 'Sadece x-api-key ile listings/active', status: r.status, body: (await r.text()).slice(0, 300) });
  } catch (e: any) {
    out.steps.push({ test: 'Sadece x-api-key', hata: e.message });
  }

  // 3) Zorla refresh dene, ham cevabi goster (DB'ye YAZMAZ)
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ETSY_API_KEY || '',
      refresh_token: rt,
    });
    const r = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const txt = await r.text();
    out.steps.push({ test: 'Refresh denemesi (DB yazmadan)', status: r.status, body: txt.slice(0, 400) });

    // Yeni token geldiyse onunla dene
    if (r.ok) {
      const td = JSON.parse(txt);
      if (td.access_token) {
        const r2 = await fetch('https://api.etsy.com/v3/application/users/me', {
          headers: {
            'x-api-key': getEtsyApiKeyHeader(),
            Authorization: 'Bearer ' + td.access_token,
          },
        });
        out.steps.push({ test: 'TAZE token ile /users/me', status: r2.status, body: (await r2.text()).slice(0, 300) });
      }
    }
  } catch (e: any) {
    out.steps.push({ test: 'Refresh denemesi', hata: e.message });
  }

  return NextResponse.json(out);
}
