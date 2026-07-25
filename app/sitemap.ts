import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://www.watercolorclipart.org';
export const revalidate = 3600; // 1 saatte bir yenilenir

const COLLECTIONS = [
  'watercolor-cat-clipart',
  'woman-art',
  'peeking-art',
  'quirky-whimsical',
  'birthday-celebration',
  'christmas-halloween',
  'easter-valentine',
  'mystic-religious',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const collectionPages: MetadataRoute.Sitemap = COLLECTIONS.map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // --- LISTING SAYFALARI (asil eksik olan kisim) ---
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ⚠️ tablo ve kolon adlarini kendi semana gore duzelt
    const { data } = await supabase
      .from('listings')
      .select('slug, listing_id, updated_at, num_favorers')
      .order('num_favorers', { ascending: false })
      .limit(2000);

    if (data) {
      listingPages = data.map((row: any) => ({
        url: `${BASE}/listing/${row.slug}-${row.listing_id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: 'weekly' as const,
        // cok favorilenen listing'lere daha yuksek oncelik
        priority: (row.num_favorers || 0) > 100 ? 0.8 : 0.6,
      }));
    }
  } catch (e) {
    console.error('sitemap listing fetch failed', e);
  }

  return [...staticPages, ...collectionPages, ...listingPages];
}
