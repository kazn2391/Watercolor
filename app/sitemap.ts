import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE = 'https://www.watercolorclipart.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: SITE + '/shop', lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: SITE + '/categories', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: SITE + '/blog', lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .order('display_order');

    if (categories) {
      categoryRoutes = categories.map((cat: any) => ({
        url: SITE + '/' + cat.slug,
        lastModified: cat.updated_at ? new Date(cat.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Sitemap categories error:', err);
  }

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (posts) {
      blogRoutes = posts.map((post: any) => ({
        url: SITE + '/blog/' + post.slug,
        lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('Sitemap blog error:', err);
  }

  return [...staticRoutes, ...categoryRoutes, ...blogRoutes];
}
