import { createClient } from '@supabase/supabase-js';
import { getEtsyApiKeyHeader, getEtsyShopId } from './etsy-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ETSY_API = 'https://api.etsy.com/v3/application';
const SECTION_ID = process.env.ETSY_NEW_SECTION_ID || '53910331';

export type CachedListing = {
  listing_id: number;
  title: string;
  url: string;
  image_url: string;
  price: string | null;
  num_favorers: number;
  created_at_etsy: string | null;
};

// Aktif listing okuma PUBLIC bir islem - sadece x-api-key yeterli.
// Bozuk/eski bir Bearer token eklemek istegi 401'e dusuruyordu.
function publicHeaders() {
  return { 'x-api-key': getEtsyApiKeyHeader() };
}

function pickImageUrl(images: any[]): string {
  if (!Array.isArray(images) || images.length === 0) return '';
  const first = images[0] || {};
  return first.url_570xN || first.url_fullxfull || first.url_680x540 || '';
}

export async function fetchSectionListingsFromEtsy(
  limit: number = 24
): Promise<{ listings: CachedListing[]; withImages: number; notes: string[] }> {
  const shopId = getEtsyShopId('shop1');
  const notes: string[] = [];

  const listUrl =
    ETSY_API + '/shops/' + shopId + '/listings/active' +
    '?shop_section_ids=' + SECTION_ID +
    '&limit=' + limit +
    '&sort_on=created&sort_order=desc' +
    '&includes=Images';

  const listRes = await fetch(listUrl, { headers: publicHeaders(), cache: 'no-store' });
  const listText = await listRes.text();
  if (!listRes.ok) {
    throw new Error('Etsy listings API ' + listRes.status + ': ' + listText.slice(0, 300));
  }

  const listData = JSON.parse(listText);
  const results: any[] = listData.results || [];
  notes.push(results.length + ' listing cekildi (section ' + SECTION_ID + ')');

  // includes=Images calismadiysa eksikler icin tek tek dene
  const missing: number[] = [];
  for (const item of results) {
    if (!pickImageUrl(item.images || item.Images || [])) missing.push(item.listing_id);
  }

  const fallbackImages: Record<number, string> = {};
  if (missing.length > 0) {
    notes.push(missing.length + ' listing icin resim eksik, tek tek deneniyor');
    let failed = 0;
    let lastError = '';

    for (const lid of missing) {
      try {
        const r = await fetch(ETSY_API + '/listings/' + lid + '/images', {
          headers: publicHeaders(),
          cache: 'no-store',
        });
        const t = await r.text();
        if (!r.ok) {
          failed++;
          lastError = r.status + ': ' + t.slice(0, 120);
        } else {
          const d = JSON.parse(t);
          const u = pickImageUrl(d.results || []);
          if (u) fallbackImages[lid] = u;
          else failed++;
        }
      } catch (e: any) {
        failed++;
        lastError = (e.message || 'bilinmeyen').slice(0, 120);
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    if (failed > 0) {
      notes.push('Resim alinamayan: ' + failed + (lastError ? ' | son hata: ' + lastError : ''));
    }
  }

  const listings: CachedListing[] = results.map((item: any) => {
    const priceObj = item.price || {};
    const priceStr =
      priceObj.amount && priceObj.divisor
        ? (priceObj.amount / priceObj.divisor).toFixed(2) + ' ' + (priceObj.currency_code || 'USD')
        : null;

    const imageUrl =
      pickImageUrl(item.images || item.Images || []) || fallbackImages[item.listing_id] || '';

    return {
      listing_id: item.listing_id,
      title: item.title || '',
      url: item.url || '',
      image_url: imageUrl,
      price: priceStr,
      num_favorers: item.num_favorers || 0,
      created_at_etsy: item.original_creation_timestamp
        ? new Date(item.original_creation_timestamp * 1000).toISOString()
        : null,
    };
  });

  const withImages = listings.filter((l) => l.image_url !== '').length;
  notes.push('Resimli: ' + withImages + '/' + listings.length);

  return { listings, withImages, notes };
}

export async function refreshNewListingsCache(): Promise<{
  inserted: number;
  total: number;
  withImages: number;
  notes: string[];
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { listings, withImages, notes } = await fetchSectionListingsFromEtsy(24);

  if (listings.length === 0) {
    return { inserted: 0, total: 0, withImages: 0, notes: [...notes, 'Listing bulunamadi'] };
  }

  // Hicbir resim yoksa eski cache'i SILME
  if (withImages === 0) {
    return {
      inserted: 0,
      total: listings.length,
      withImages: 0,
      notes: [...notes, 'HIC RESIM ALINAMADI - cache korundu'],
    };
  }

  await supabase.from('new_listings_cache').delete().neq('listing_id', 0);

  const rows = listings.map((l) => ({
    listing_id: l.listing_id,
    title: l.title,
    url: l.url,
    image_url: l.image_url,
    price: l.price,
    num_favorers: l.num_favorers,
    created_at_etsy: l.created_at_etsy,
    cached_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('new_listings_cache').insert(rows);
  if (error) throw new Error('Supabase insert: ' + error.message);

  return { inserted: rows.length, total: listings.length, withImages, notes };
}

export async function getCachedNewListings(limit: number = 12): Promise<CachedListing[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from('new_listings_cache')
    .select('*')
    .order('created_at_etsy', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getCachedNewListings error:', error);
    return [];
  }
  return data || [];
}
