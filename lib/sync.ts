import { supabaseAdmin } from './supabase';
import { etsy, normalizePrice, pickBestImage, normalizeImages, type EtsyListing } from './etsy';
import { makeSlug } from './slugify';
import { stripHtml } from './seo';
import { inferCategoriesFromTags } from './categories';

export interface SyncResult {
  total: number;
  processed: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  hasMore: boolean;
  nextOffset: number;
  durationMs: number;
  errorMessages: string[];
}

const BATCH_LIMIT = 200;

export async function fullSync(offset = 0): Promise<SyncResult> {
  const start = Date.now();
  const db = supabaseAdmin();

  const { data: logEntry } = await db
    .from('sync_logs')
    .insert({ sync_type: 'partial', status: 'running' })
    .select()
    .single();
  const logId = logEntry?.id;

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  try {
    const allListings = await etsy.getAllActiveListingsLight();
    const total = allListings.length;

    const slice = allListings.slice(offset, offset + BATCH_LIMIT);
    const sliceIds = slice.map((l) => l.listing_id);

    const enriched = await etsy.getListingsByIds(sliceIds);
    const enrichedMap = new Map<number, EtsyListing>();
    for (const e of enriched) enrichedMap.set(e.listing_id, e);

    const { data: categories } = await db.from('categories').select('id, slug');
    const slugToCategoryId = new Map<string, number>();
    for (const cat of categories || []) slugToCategoryId.set(cat.slug, cat.id);

    for (const l of slice) {
      try {
        const e = enrichedMap.get(l.listing_id);
        const withImages = e && e.images && e.images.length > 0 ? { ...l, images: e.images } : l;
        const result = await upsertListing(withImages, slugToCategoryId);
        if (result === 'added') added++;
        else if (result === 'updated') updated++;
      } catch (err: any) {
        errors++;
        if (errorMessages.length < 15) errorMessages.push('Listing ' + l.listing_id + ': ' + err.message);
      }
    }

    await updateCategoryCounts(db);

    const nextOffset = offset + BATCH_LIMIT;
    const hasMore = nextOffset < total;

    const result: SyncResult = {
      total,
      processed: slice.length,
      added,
      updated,
      skipped,
      errors,
      hasMore,
      nextOffset: hasMore ? nextOffset : 0,
      durationMs: Date.now() - start,
      errorMessages,
    };

    if (logId) {
      await db.from('sync_logs').update({
        status: errors > slice.length / 2 ? 'failed' : 'success',
        listings_added: added,
        listings_updated: updated,
        completed_at: new Date().toISOString(),
        error_message: hasMore
          ? 'Partial OK. Next offset: ' + nextOffset + ' / ' + total
          : 'Full sync complete: ' + total + ' listings',
      }).eq('id', logId);
    }

    return result;
  } catch (err: any) {
    if (logId) {
      await db.from('sync_logs').update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
      }).eq('id', logId);
    }
    throw err;
  }
}

async function upsertListing(l: EtsyListing, slugToCategoryId: Map<string, number>): Promise<'added' | 'updated'> {
  const db = supabaseAdmin();

  const price = normalizePrice(l.price);
  const originalPrice = l.original_price ? normalizePrice(l.original_price) : null;
  const onSale = !!(originalPrice && price && originalPrice > price);
  const discountPercent = onSale && originalPrice && price
    ? Math.round((1 - price / originalPrice) * 100) : null;

  const slug = makeSlug(l.title, l.listing_id);
  const mainImage = pickBestImage(l.images);
  const images = normalizeImages(l.images);
  const description = stripHtml(l.description || '').slice(0, 2000);
  const seoTitle = l.title.slice(0, 60) + ' | Watercolor Clipart';
  const seoDescription = description.slice(0, 158);

  const { data: existing } = await db.from('listings').select('id').eq('id', l.listing_id).maybeSingle();

  const row = {
    id: l.listing_id,
    slug,
    title: l.title,
    description,
    price,
    original_price: originalPrice,
    currency_code: l.price?.currency_code || 'USD',
    on_sale: onSale,
    discount_percent: discountPercent,
    etsy_url: l.url,
    state: l.state,
    main_image_url: mainImage,
    images,
    tags: l.tags || [],
    materials: l.materials || [],
    views: l.views || 0,
    num_favorers: l.num_favorers || 0,
    quantity: l.quantity,
    who_made: l.who_made,
    when_made: l.when_made,
    is_digital: l.is_digital,
    etsy_created_at: new Date(l.creation_timestamp * 1000).toISOString(),
    etsy_updated_at: new Date(l.updated_timestamp * 1000).toISOString(),
    last_synced_at: new Date().toISOString(),
    seo_title: seoTitle,
    seo_description: seoDescription,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from('listings').upsert(row, { onConflict: 'id' });
  if (error) throw error;

  const categorySlugs = inferCategoriesFromTags(l.tags || [], l.title);
  await db.from('listing_categories').delete().eq('listing_id', l.listing_id);

  const inserts = categorySlugs
    .map((s) => slugToCategoryId.get(s))
    .filter((id): id is number => typeof id === 'number')
    .map((category_id) => ({ listing_id: l.listing_id, category_id }));

  if (inserts.length > 0) {
    await db.from('listing_categories').insert(inserts);
  }
  return existing ? 'updated' : 'added';
}

async function updateCategoryCounts(db: ReturnType<typeof supabaseAdmin>) {
  const { data: counts } = await db.from('listing_categories').select('category_id');
  if (!counts) return;
  const tally = new Map<number, number>();
  for (const row of counts) tally.set(row.category_id, (tally.get(row.category_id) || 0) + 1);
  for (const [categoryId, count] of tally.entries()) {
    await db.from('categories').update({ listing_count: count }).eq('id', categoryId);
  }
}
