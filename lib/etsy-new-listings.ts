import { createClient } from '@supabase/supabase-js';
import { getValidEtsyToken } from './etsy-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ETSY_API_KEY = process.env.ETSY_API_KEY!;
const ETSY_SHARED_SECRET = process.env.ETSY_SHARED_SECRET!;
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

  const headers = {
    'x-api-key': ETSY_API_KEY + ':' + ETSY_SHARED_SECRET,
    'Authorization': 'Bearer ' + token
  };

  const listUrl = 'https://openapi.etsy.com/v3/application/shops/' + SHOP_ID + '/listings/active?shop_section_ids=' + SECTION_ID + '&limit=' + limit + '&sort_on=created&sort_order=desc';

  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error('Etsy listings API ' + listRes.status + ': ' + text);
  }

  const listData = await listRes.json();
  const results = listData.results || [];

  const listingIds: number[] = results.map((r: any) => r.listing_id).filter(Boolean);
  const imagesByListingId: Record<number, string> = {};

  for (const lid of listingIds) {
    try {
      const imgUrl = 'https://openapi.etsy.com/v3/application/listings/' + lid + '/images';
      const imgRes = await fetch(imgUrl, { headers });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const firstImg = imgData.results && imgData.results.length > 0 ? imgData.results[0] : null;
        if (firstImg) {
          imagesByListingId[lid] = firstImg.url_570xN || firstImg.url_fullxfull || '';
        }
      }
    } catch (err) {
      console.error('Image fetch failed for listing ' + lid, err);
    }
  }

  const listings: CachedListing[] = results.map((item: any) => {
    const priceObj = item.price || {};
    const priceStr = priceObj.amount && priceObj.divisor
      ? (priceObj.amount / priceObj.divisor).toFixed(2) + ' ' + (priceObj.currency_code || 'USD')
      : null;

    return {
      listing_id: item.listing_id,
      title: item.title || '',
      url: item.url || '',
      image_url: imagesByListingId[item.listing_id] || '',
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
