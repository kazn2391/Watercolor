import { supabaseAdmin } from './supabase';
import { etsy, normalizePrice, pickBestImage, normalizeImages, type EtsyListing } from './etsy';
import { makeSlug } from './slugify';
import { stripHtml } from './seo';
import { inferCategoriesFromTags } from './categories';

export interface SyncResult {
  total: number;
  added: number;
  updated: number;
  errors: number;
  durationMs: number;
  errorMessages: string[];
}

export async function fullSync(): Promise<SyncResult> {
  const start = Date.now();
  const db = supabaseAdmin();

  const { data: logEntry } = await db
    .from('sync_logs')
    .insert({ sync_type: 'full', status: 'running' })
    .select()
    .single();
  const logId = logEntry?.id;

  let added = 0, updated = 0, errors = 0;
  const errorMessages: string[] = [];

  try {
    const listings = await etsy.getAllActiveListings();

    const { data: categories } = await db.from('categories').select('id, slug');
    const slugToCategoryId = new Map<string, number>();
    for (const cat of categories || []) slugToCategoryId.set(cat.slug, cat.id);

    for (const l of listings) {
      try {
        const result = await upsertListing(l, slugToCategoryId);
        if (result === 'added') added++;
        else if (result === 'updated') updated++;
      } catch (err: any) {
        errors++;
        errorMessages.push(`Listing ${l.listing_id}: ${err.message}`);
        if (errorMessages.length > 20) errorMessages.length = 20;
      }
    }

    await updateCategoryCounts(db);

    const result: SyncResult = {
      total: listings.length, added, updated, errors,
      durationMs: Date.now() - start, errorMessages,
    };

    if (logId) {
      await db.from('sync_logs').update({
        status: errors > listings.length / 2 ? 'failed' : 'success',
        listings_added: added,
        listings_updated: updated,
        completed_at: new Date().toISOString(),
        error_message: errorMessages.slice(0, 5).join('\n') || null,
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
  const seoTitle = `${l.title.slice(0, 60)} | Watercolor Clipart`;
  const seoDescription = description.slice(0, 158);

  const { data: existing } = await db.from('listings').select('id').eq('id', l.listing_id).maybeSingle();

  const row = {
    id: l.listing_id, slug,
    title: l.title, description, price,
    original_price: originalPrice,
    currency_code: l.price?.currency_code || 'USD',
    on_sale: onSale, discount_percent: discountPercent,
    etsy_url: l.url, state: l.state,
    main_image_url: mainImage, images,
    tags: l.tags || [], materials: l.materials || [],
    views: l.views || 0, num_favorers: l.num_favorers || 0,
    quantity: l.quantity, who_made: l.who_made, when_made: l.when_made,
    is_digital: l.is_digital,
    etsy_created_at: new Date(l.creation_timestamp * 1000).toISOString(),
    etsy_updated_at: new Date(l.updated_timestamp * 1000).toISOString(),
    last_synced_at: new Date().toISOString(),
    seo_title: seoTitle, seo_description: seoDescription,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from('listings').upsert(row, { onConflict: 'id' });
  if (error) throw error;

  const categorySlugs = inferCategoriesFromTags(l.tags || [], l.title);
  await db.from('listing_categories').delete().eq('listing_id', l.listing_id);

  const inserts = categorySlugs
    .map((slug) => slugToCategoryId.get(slug))
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
  const { data: cats } = await db.from('categories').select('id, hero_image_url');
  for (const cat of cats || []) {
    if (cat.hero_image_url) continue;
    const { data: firstListing } = await db
      .from('listing_categories').select('listings(main_image_url)')
      .eq('category_id', cat.id).limit(1).single();
    const heroUrl = (firstListing as any)?.listings?.main_image_url;
    if (heroUrl) await db.from('categories').update({ hero_image_url: heroUrl }).eq('id', cat.id);
  }
}
