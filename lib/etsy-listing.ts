import { getValidEtsyToken, getEtsyApiKeyHeader } from './etsy-auth';

const ETSY_API = 'https://api.etsy.com/v3/application';
const SHOP_ID = process.env.ETSY_SHOP_ID || '49999102';

const FIXED_PRICE = 2.22;
const FIXED_QUANTITY = 100;

interface CreateInput {
  title: string;
  description: string;
  tags: string[];
  taxonomyId: number;
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

export async function createDraftListing(input: CreateInput): Promise<number> {
  const token = await getValidEtsyToken();

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
  for (const tag of input.tags.slice(0, 13)) {
    body.append('tags', tag);
  }

  const res = await fetch(
    ETSY_API + '/shops/' + SHOP_ID + '/listings',
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

export async function uploadListingImage(
  listingId: number,
  imageBuffer: Buffer,
  rank: number
): Promise<void> {
  const token = await getValidEtsyToken();

  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/png' });
  form.append('image', blob, 'design-' + rank + '.png');
  form.append('rank', String(rank));

  const res = await fetch(
    ETSY_API + '/shops/' + SHOP_ID + '/listings/' + listingId + '/images',
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
  fileName: string
): Promise<void> {
  const token = await getValidEtsyToken();

  const form = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  form.append('file', blob, fileName);
  form.append('name', fileName);

  const res = await fetch(
    ETSY_API + '/shops/' + SHOP_ID + '/listings/' + listingId + '/files',
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
