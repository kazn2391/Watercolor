import { getValidEtsyToken, getEtsyApiKeyHeader, getEtsyShopId, withEtsyTokenRetry } from './etsy-auth';

const ETSY_API = 'https://api.etsy.com/v3/application';

const FIXED_PRICE = 2.22;
const FIXED_QUANTITY = 100;

interface CreateInput {
  title: string;
  description: string;
  tags: string[];
  taxonomyId: number;
  materials?: string[];
  styles?: string[];
  shopSectionId?: number;
}

// Taxonomy agacini bir kez cekip bellekte tut (her cagride tekrar cekmesin)
let taxonomyCache: any[] | null = null;

async function getTaxonomyTree(): Promise<any[]> {
  if (taxonomyCache) return taxonomyCache;
  const res = await fetch(ETSY_API + '/seller-taxonomy/nodes', {
    headers: { 'x-api-key': getEtsyApiKeyHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Taxonomy alinamadi: ' + JSON.stringify(data).slice(0, 200));
  taxonomyCache = data.results || [];
  return taxonomyCache!;
}

/**
 * Taxonomy agacinda isimle arama yapar.
 * needles: aranacak isim parcalari (kucuk harf). Sirayla denenir.
 */
async function findTaxonomyIdByName(needles: string[]): Promise<number | null> {
  const tree = await getTaxonomyTree();

  function search(nodes: any[], needle: string): number | null {
    for (const n of nodes || []) {
      if (n.name && n.name.toLowerCase().indexOf(needle) !== -1) return n.id;
      if (n.children) {
        const r = search(n.children, needle);
        if (r) return r;
      }
    }
    return null;
  }

  for (const needle of needles) {
    const id = search(tree, needle);
    if (id) return id;
  }
  return null;
}

export async function findClipArtTaxonomyId(): Promise<number> {
  const id = await findTaxonomyIdByName(['clip art']);
  if (!id) throw new Error('Clip Art taxonomy bulunamadi');
  return id;
}

export async function findDigitalPrintsTaxonomyId(): Promise<number> {
  const id = await findTaxonomyIdByName(['digital prints', 'digital print']);
  if (!id) throw new Error('Digital Prints taxonomy bulunamadi');
  return id;
}

/**
 * categoryMode: 'clipart' (varsayilan) veya 'digital_prints'
 */
export async function findTaxonomyIdForMode(categoryMode: string): Promise<number> {
  if (categoryMode === 'digital_prints') {
    return findDigitalPrintsTaxonomyId();
  }
  return findClipArtTaxonomyId();
}

export async function createDraftListing(input: CreateInput, shopKey: string = 'shop1'): Promise<number> {
  const shopId = getEtsyShopId(shopKey);

  return withEtsyTokenRetry(shopKey, async (token) => {
    const body = new URLSearchParams();
    body.append('quantity', String(FIXED_QUANTITY));
    body.append('title', input.title);
    body.append('description', input.description);
    body.append('price', String(FIXED_PRICE));
    body.append('who_made', 'i_did');
    body.append('when_made', '2020_2026');
    body.append('taxonomy_id', String(input.taxonomyId));
    body.append('is_supply', 'true');
    body.append('type', 'download');
    body.append('is_personalizable', 'false');
    body.append('should_auto_renew', 'true');
    body.append('state', 'draft');
    body.append('tags', input.tags.slice(0, 13).join(','));

    if (input.materials && input.materials.length > 0) {
      body.append('materials', input.materials.slice(0, 13).join(','));
    }
    if (input.styles && input.styles.length > 0) {
      body.append('styles', input.styles.slice(0, 2).join(','));
    }
    if (input.shopSectionId) {
      body.append('shop_section_id', String(input.shopSectionId));
    }

    const res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.listing_id) {
      throw new Error('createDraftListing basarisiz: ' + JSON.stringify(data).slice(0, 400));
    }
    return data.listing_id as number;
  });
}

export async function updateListingProperty(
  listingId: number,
  propertyId: number,
  valueIds: number[],
  values: string[],
  shopKey: string = 'shop1'
): Promise<boolean> {
  try {
    const shopId = getEtsyShopId(shopKey);
    return await withEtsyTokenRetry(shopKey, async (token) => {
      const body = new URLSearchParams();
      body.append('value_ids', valueIds.join(','));
      body.append('values', values.join(','));

      const res = await fetch(
        ETSY_API + '/shops/' + shopId + '/listings/' + listingId + '/properties/' + propertyId,
        {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer ' + token,
            'x-api-key': getEtsyApiKeyHeader(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 401) throw new Error('401 invalid_token: ' + t.slice(0, 100));
        return false;
      }
      return true;
    });
  } catch (e) {
    return false;
  }
}

export async function uploadListingImage(
  listingId: number,
  imageBuffer: Buffer,
  rank: number,
  altText: string,
  shopKey: string = 'shop1'
): Promise<void> {
  const shopId = getEtsyShopId(shopKey);

  return withEtsyTokenRetry(shopKey, async (token) => {
    const form = new FormData();
    const bytes = new Uint8Array(imageBuffer);
    const blob = new Blob([bytes], { type: 'image/png' });
    form.append('image', blob, 'design-' + rank + '.png');
    form.append('rank', String(rank));
    if (altText) {
      form.append('alt_text', altText.slice(0, 250));
    }

    const res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings/' + listingId + '/images',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
        },
        body: form,
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error('Resim ' + rank + ' yuklenemedi: ' + t.slice(0, 200));
    }
  });
}

export async function uploadListingFile(
  listingId: number,
  pdfBuffer: Buffer,
  fileName: string,
  shopKey: string = 'shop1'
): Promise<void> {
  const shopId = getEtsyShopId(shopKey);

  return withEtsyTokenRetry(shopKey, async (token) => {
    const form = new FormData();
    const bytes = new Uint8Array(pdfBuffer);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    form.append('file', blob, fileName);
    form.append('name', fileName);

    const res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings/' + listingId + '/files',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
        },
        body: form,
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error('PDF yuklenemedi: ' + t.slice(0, 200));
    }
  });
}

export async function uploadListingVideo(
  listingId: number,
  videoBuffer: Buffer,
  fileName: string,
  shopKey: string = 'shop1'
): Promise<void> {
  const shopId = getEtsyShopId(shopKey);

  return withEtsyTokenRetry(shopKey, async (token) => {
    const form = new FormData();
    const bytes = new Uint8Array(videoBuffer);
    const blob = new Blob([bytes], { type: 'video/mp4' });
    form.append('video', blob, fileName);
    form.append('name', fileName);

    const res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings/' + listingId + '/videos',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
        },
        body: form,
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error('Video yuklenemedi: ' + t.slice(0, 200));
    }
  });
}
