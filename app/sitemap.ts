import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Kategoriler (DB'den, elle yazmaya gerek yok)
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from('categories').select('slug');
    if (data) {
      categoryPages = data.map((c: any) => ({
        url: `${BASE}/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      }));
    }
  } catch (e) {
    console.error('sitemap categories failed', e);
  }

  // Listing sayfalari — slug zaten ID iceriyor
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from('listings').select('slug').limit(5000);
    if (data) {
      listingPages = data.map((l: any) => ({
        url: `${BASE}/listing/${l.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (e) {
    console.error('sitemap listings failed', e);
  }

  return [...staticPages, ...categoryPages, ...listingPages];
}
