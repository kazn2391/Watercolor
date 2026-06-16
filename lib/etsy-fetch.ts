import { getValidEtsyToken, getEtsyApiKeyHeader, getEtsyShopId } from './etsy-auth';

const ETSY_API = 'https://api.etsy.com/v3/application';

export interface ListingDetails {
  listingId: number;
  title: string;
  description: string;
  tags: string[];
  price: number;
  views: number;
  numFavorers: number;
  quantity: number;
  createdTimestamp: number;
  lastModifiedTimestamp: number;
  state: string;
  url: string;
}

/**
 * URL'den listing ID cikarir
 * https://www.etsy.com/listing/1234567890/title-here -> 1234567890
 */
export function extractListingId(url: string): number | null {
  const m = url.match(/\/listing\/(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

/**
 * Etsy API'den listing detaylarini ceker.
 * Aktif (yayinda) listing'ler icin GENEL endpoint kullanir.
 * Draft listing'ler icin shop endpoint'i kullanir (fallback).
 */
export async function fetchListingDetails(
  listingId: number,
  shopKey: string = 'shop1'
): Promise<ListingDetails> {
  const token = await getValidEtsyToken(shopKey);
  const apiKey = getEtsyApiKeyHeader();
  const shopId = getEtsyShopId(shopKey);

  // ONCE genel endpoint dene (aktif listing icin)
  let res = await fetch(
    ETSY_API + '/listings/' + listingId + '?includes=Tags',
    {
      headers: {
        Authorization: 'Bearer ' + token,
        'x-api-key': apiKey,
      },
    }
  );

  // Eger 404 ise shop endpoint dene (draft listing icin)
  if (res.status === 404) {
    res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings/' + listingId + '?includes=Tags',
      {
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': apiKey,
        },
      }
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Listing detay alinamadi: ' + JSON.stringify(data).slice(0, 300));
  }

  const tags: string[] = Array.isArray(data.tags) ? data.tags : [];

  return {
    listingId: data.listing_id,
    title: data.title || '',
    description: data.description || '',
    tags,
    price: data.price ? parseFloat(data.price.amount) / parseFloat(data.price.divisor) : 0,
    views: data.views || 0,
    numFavorers: data.num_favorers || 0,
    quantity: data.quantity || 0,
    createdTimestamp: data.created_timestamp || 0,
    lastModifiedTimestamp: data.last_modified_timestamp || 0,
    state: data.state || 'unknown',
    url: data.url || '',
  };
}

/**
 * Listing'in performans istatistiklerini hesaplar
 */
export interface ListingStats {
  ageInDays: number;
  daysSinceModified: number;
  conversionRate: number;
  viewsPerDay: number;
  favoriteRate: number;
}

export function calculateStats(details: ListingDetails, sales: number = 0): ListingStats {
  const nowMs = Date.now();
  const createdMs = details.createdTimestamp * 1000;
  const modifiedMs = details.lastModifiedTimestamp * 1000;

  const ageInDays = Math.max(1, Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24)));
  const daysSinceModified = Math.max(0, Math.floor((nowMs - modifiedMs) / (1000 * 60 * 60 * 24)));

  const conversionRate = details.views > 0 ? (sales / details.views) * 100 : 0;
  const viewsPerDay = details.views / ageInDays;
  const favoriteRate = details.views > 0 ? (details.numFavorers / details.views) * 100 : 0;

  return {
    ageInDays,
    daysSinceModified,
    conversionRate,
    viewsPerDay,
    favoriteRate,
  };
}
