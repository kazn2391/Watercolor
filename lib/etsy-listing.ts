import { getValidEtsyToken, getEtsyApiKeyHeader, getEtsyShopId } from './etsy-auth';

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

export async function findClipArtTaxonomyId(): Promise<number> {
  const res = await fetch(ETSY_API + '/seller-taxonomy/nodes', {
    headers: { 'x-api-key': getEtsyApiKeyHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Taxonomy alinamadi: ' + JSON.stringify(data).slice(0, 200));

  function search(nodes: any[]): number | null {
    for (const n of nodes || []) {
      if (n.name && n.name.toLowerCase().indexOf('clip art') !== -1) return n.id;
      if (n.children) {
        const r = search(n.children);
        if (r) return r;
      }
    }
    return null;
  }
  const id = search(data.results);
  if (!id) throw new Error('Clip Art taxonomy bulunamadi');
  return id;
}

export async function createDraftListing(input: CreateInput, shopKey: string = 'shop1'): Promise<number> {
  const token = await getValidEtsyToken(shopKey);
  const shopId = getEtsyShopId(shopKey);

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
  const tagString = input.tags.slice(0, 13).join(',');
  body.append('tags', tagString);

  // Materials - max 13, elle girisle esitlik icin
  if (input.materials && input.materials.length > 0) {
    body.append('materials', input.materials.slice(0, 13).join(','));
  }

  // Styles - max 2, arama sinyali
  if (input.styles && input.styles.length > 0) {
    body.append('styles', input.styles.slice(0, 2).join(','));
  }

  // Shop section - listing magazada dogru rafa otursun
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
  return data.listing_id;
}

export async function updateListingProperty(
  listingId: number,
  propertyId: number,
  valueIds: number[],
  values: string[],
  shopKey: string = 'shop1'
): Promise<boolean> {
  try {
    const token = await getValidEtsyToken(shopKey);
    const shopId = getEtsyShopId(shopKey);

    // Etsy form-encoded API coklu degeri virgullu tek parametre olarak ister
    // (tekrarli append sadece son degeri aliyordu - craft type bug'inin sebebi)
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
      return false;
    }
    return true;
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
  const token = await getValidEtsyToken(shopKey);
  const shopId = getEtsyShopId(shopKey);

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
}

export async function uploadListingFile(
  listingId: number,
  pdfBuffer: Buffer,
  fileName: string,
  shopKey: string = 'shop1'
): Promise<void> {
  const token = await getValidEtsyToken(shopKey);
  const shopId = getEtsyShopId(shopKey);

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
}

export async function uploadListingVideo(
  listingId: number,
  videoBuffer: Buffer,
  fileName: string,
  shopKey: string = 'shop1'
): Promise<void> {
  const token = await getValidEtsyToken(shopKey);
  const shopId = getEtsyShopId(shopKey);

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
}
