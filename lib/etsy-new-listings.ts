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
