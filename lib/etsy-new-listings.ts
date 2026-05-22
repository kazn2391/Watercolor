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

  async function fetchImageWithRetry(lid: number, attempt: number = 1): Promise<string> {
    try {
      const imgUrl = 'https://openapi.etsy.com/v3/application/listings/' + lid + '/images';
      const imgRes = await fetch(imgUrl, { headers });

      if (imgRes.status === 429 || imgRes.status >= 500) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          return fetchImageWithRetry(lid, attempt + 1);
        }
        console.error('Image fetch failed after retries for listing ' + lid + ' status ' + imgRes.status);
        return '';
      }

      if (!imgRes.ok) {
        console.error('Image fetch error ' + imgRes.status + ' for listing ' + lid);
        return '';
      }

      const imgData = await imgRes.json();
      const firstImg = imgData.results && imgData.results.length > 0 ? imgData.results[0] : null;
      if (firstImg) {
        return firstImg.url_570xN || firstImg.url_fullxfull || '';
      }
      return '';
    } catch (err) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return fetchImageWithRetry(lid, attempt + 1);
      }
      console.error('Image fetch exception for listing ' + lid, err);
      return '';
    }
  }

  const imagesByListingId: Record<number, string> = {};
  const BATCH_SIZE = 5;

  for (let i = 0; i < listingIds.length; i += BATCH_SIZE) {
    const batch = listingIds.slice(i, i + BATCH_SIZE);
    const promises = batch.map(lid => fetchImageWithRetry(lid).then(url => ({ lid, url })));
    const settled = await Promise.all(promises);
    for (const item of settled) {
      imagesByListingId[item.lid] = item.url;
    }
    if (i + BATCH_SIZE < listingIds.length) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  const successCount = Object.values(imagesByListingId).filter(u => u !== '').length;
  console.log('Image fetch complete: ' + successCount + '/' + listingIds.length + ' images retrieved');

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
