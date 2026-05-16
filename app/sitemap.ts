import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), priority: 1, changeFrequency: 'daily' },
    { url: SITE_URL + '/shop', lastModified: new Date(), priority: 0.9, changeFrequency: 'daily' },
    { url: SITE_URL + '/categories', lastModified: new Date(), priority: 0.8, changeFrequency: 'weekly' },
    { url: SITE_URL + '/blog', lastModified: new Date(), priority: 0.8, changeFrequency: 'daily' },
  ];

  const { data: categories } = await supabase.from('categories').select('slug, updated_at');
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: SITE_URL + '/' + c.slug,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    priority: 0.8,
    changeFrequency: 'weekly',
  }));

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published');
  const blogPages: MetadataRoute.Sitemap = (posts || []).map((p) => ({
    url: SITE_URL + '/blog/' + p.slug,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    priority: 0.7,
    changeFrequency: 'monthly',
  }));

  const { data: listings } = await supabase
    .from('listings')
    .select('slug, updated_at')
    .eq('state', 'active')
    .order('num_favorers', { ascending: false })
    .limit(5000);

  const listingPages: MetadataRoute.Sitemap = (listings || []).map((l) => ({
    url: SITE_URL + '/listing/' + l.slug,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    priority: 0.7,
    changeFrequency: 'weekly',
  }));

  return [...staticPages, ...categoryPages, ...blogPages, ...listingPages];
}
