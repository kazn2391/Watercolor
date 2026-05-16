const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application';

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  state: string;
  url: string;
  price: { amount: number; divisor: number; currency_code: string };
  original_price?: { amount: number; divisor: number; currency_code: string };
  tags: string[];
  materials: string[];
  views: number;
  num_favorers: number;
  quantity: number;
  who_made: string;
  when_made: string;
  is_digital: boolean;
  creation_timestamp: number;
  updated_timestamp: number;
  images?: EtsyImage[];
  taxonomy_id?: number;
  shop_section_id?: number;
}

export interface EtsyImage {
  listing_image_id: number;
  listing_id?: number;
  url_75x75: string;
  url_170x135: string;
  url_570xN: string;
  url_fullxfull: string;
  alt_text?: string;
  rank: number;
}

export interface EtsySection {
  shop_section_id: number;
  title: string;
  rank: number;
  active_listing_count: number;
}

class EtsyClient {
  private apiKey: string;
  private sharedSecret: string;
  private shopId: string;

  constructor() {
    this.apiKey = process.env.ETSY_API_KEY!;
    this.sharedSecret = process.env.ETSY_SHARED_SECRET || '';
    this.shopId = process.env.ETSY_SHOP_ID || '49999102';
    if (!this.apiKey) throw new Error('ETSY_API_KEY is not set');
  }

  private getApiKeyHeader(): string {
    return this.sharedSecret ? this.apiKey + ':' + this.sharedSecret : this.apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    const url = ETSY_API_BASE + path;
    const res = await fetch(url, {
      headers: { 'x-api-key': this.getApiKeyHeader(), Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error('Etsy API ' + res.status + ': ' + body.slice(0, 200));
    }
    return res.json() as Promise<T>;
  }

  async getActiveListings(limit = 100, offset = 0) {
    const path = '/shops/' + this.shopId + '/listings/active?limit=' + limit + '&offset=' + offset;
    return this.request<{ count: number; results: EtsyListing[] }>(path);
  }

  async getAllActiveListingsLight(): Promise<EtsyListing[]> {
    const listings: EtsyListing[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const page = await this.getActiveListings(limit, offset);
      listings.push(...page.results);
      if (page.results.length < limit) break;
      offset += limit;
      await new Promise((r) => setTimeout(r, 400));
    }
    return listings;
  }

  async getListingsByIds(listingIds: number[]): Promise<EtsyListing[]> {
    if (listingIds.length === 0) return [];
    const all: EtsyListing[] = [];
    const batchSize = 100;
    for (let i = 0; i < listingIds.length; i += batchSize) {
      const batch = listingIds.slice(i, i + batchSize);
      const ids = batch.join(',');
      const path = '/listings/batch?listing_ids=' + ids + '&includes=Images';
      const res = await this.request<{ count: number; results: EtsyListing[] }>(path);
      all.push(...(res.results || []));
      if (i + batchSize < listingIds.length) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    return all;
  }

  async getAllActiveListings(): Promise<EtsyListing[]> {
    const listings = await this.getAllActiveListingsLight();
    const ids = listings.map((l) => l.listing_id);
    const enriched = await this.getListingsByIds(ids);
    const enrichedMap = new Map<number, EtsyListing>();
    for (const l of enriched) enrichedMap.set(l.listing_id, l);
    return listings.map((l) => {
      const e = enrichedMap.get(l.listing_id);
      if (e && e.images && e.images.length > 0) return { ...l, images: e.images };
      return l;
    });
  }

  async getShopSections() {
    const path = '/shops/' + this.shopId + '/sections';
    return this.request<{ count: number; results: EtsySection[] }>(path);
  }
}

export const etsy = new EtsyClient();

export function normalizePrice(p?: { amount: number; divisor: number }): number | null {
  if (!p) return null;
  return Math.round((p.amount / p.divisor) * 100) / 100;
}

export function pickBestImage(images?: EtsyImage[]): string | null {
  if (!images || images.length === 0) return null;
  const first = images.sort((a, b) => a.rank - b.rank)[0];
  return first.url_570xN || first.url_fullxfull || null;
}

export function normalizeImages(images?: EtsyImage[]) {
  if (!images) return [];
  return images
    .sort((a, b) => a.rank - b.rank)
    .map((img) => ({
      url: img.url_570xN || img.url_fullxfull,
      url_full: img.url_fullxfull,
      url_small: img.url_170x135,
      alt: img.alt_text || '',
    }));
}
