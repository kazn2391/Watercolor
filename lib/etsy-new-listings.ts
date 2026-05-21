import { createClient } from '@supabase/supabase-js';
import { getValidEtsyToken } from './etsy-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ETSY_API_KEY = process.env.ETSY_API_KEY!;
const SHOP_ID = '49999102';
const SECTION_ID = '53910331';

export type CachedListing = {
  listing_id: number;
  title: string;
  url: string;
  image_url: string;
  price: string | null;
  num_favorers: number;
  created_at_etsy: string | null;
};

export async function fetchSectionListingsFromEtsy(limit: number = 24): Promise<CachedListing[]> {
  const token = await getValidEtsyToken();
  if (!token) throw new Error('Etsy not authenticated');

  const url = 'https://openapi.etsy.com/v3/application/shops/' + SHOP_ID + '/listings/active?shop_section_ids=' + SECTION_ID + '&limit=' + limit + '&sort_on=created&sort_order=desc&includes=Images';

  const res = await fetch(url, {
    headers: {
      'x-api-key': ETSY_API_KEY,
      'Authorization': 'Bearer ' + token
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Etsy API ' + res.status + ': ' + text);
  }

  const data = await res.json();
  const results = data.results || [];

  const listings: CachedListing[] = results.map((item: any) => {
    const firstImage = item.images && item.images.length > 0 ? item.images[0] : null;
    const imageUrl = firstImage ? (firstImage.url_570xN || firstImage.url_fullxfull || '') : '';
    const priceObj = item.price || {};
    const priceStr = priceObj.amount && priceObj.divisor
      ? (priceObj.amount / priceObj.divisor).toFixed(2) + ' ' + (priceObj.currency_code || 'USD')
      : null;

    return {
      listing_id: item.listing_id,
      title: item.title || '',
      url: item.url || '',
      image_url: imageUrl,
      price: priceStr,
      num_favorers: item.num_favorers || 0,
      created_at_etsy: item.original_creation_timestamp
        ? new Date(item.original_creation_timestamp * 1000).toISOString()
        : null
    };
  });

  return listings;
}

export async function refreshNewListingsCache(): Promise<{ inserted: number; total: number }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const listings = await fetchSectionListingsFromEtsy(24);

  if (listings.length === 0) {
    return { inserted: 0, total: 0 };
  }

  await supabase.from('new_listings_cache').delete().neq('listing_id', 0);

  const rows = listings.map(l => ({
    listing_id: l.listing_id,
    title: l.title,
    url: l.url,
    image_url: l.image_url,
    price: l.price,
    num_favorers: l.num_favorers,
    created_at_etsy: l.created_at_etsy,
    cached_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('new_listings_cache').insert(rows);
  if (error) throw new Error('Supabase insert: ' + error.message);

  return { inserted: rows.length, total: listings.length };
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
