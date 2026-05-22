import { MetadataRoute } from 'next';

const SITE = 'https://www.watercolorclipart.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        disallow: '/',
      },
    ],
    sitemap: SITE + '/sitemap.xml',
    host: SITE,
  };
}
