import type { Metadata } from 'next';

const SITE = 'https://www.watercolorclipart.org';

type CategoryMetaInput = {
  name: string;
  slug: string;
  description?: string;
  listingCount?: number;
  heroImageUrl?: string;
};

export function categoryMetadata(input: CategoryMetaInput): Metadata {
  const { name, slug, description, listingCount, heroImageUrl } = input;
  const count = listingCount ? listingCount + '+ ' : '';
  
  const title = name + ' — ' + count + 'Watercolor Clipart Designs';
  
  const desc = description || 
    'Browse ' + count + name.toLowerCase() + ' watercolor clipart designs by SuzyFlowArt. AI-crafted PNG and JPG digital downloads. Instant delivery via Etsy. Commercial use options available.';

  return {
    title,
    description: desc,
    keywords: [
      name.toLowerCase() + ' clipart',
      name.toLowerCase() + ' watercolor',
      name.toLowerCase() + ' PNG',
      'watercolor ' + name.toLowerCase(),
      name.toLowerCase() + ' digital download',
      'AI watercolor ' + name.toLowerCase(),
    ],
    alternates: {
      canonical: '/' + slug,
    },
    openGraph: {
      type: 'website',
      title: title,
      description: desc,
      url: SITE + '/' + slug,
      images: heroImageUrl ? [{ url: heroImageUrl, width: 1200, height: 1200, alt: name + ' watercolor clipart' }] : ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: desc,
      images: heroImageUrl ? [heroImageUrl] : ['/opengraph-image'],
    },
  };
}

export function listingBreadcrumb(categoryName: string, categorySlug: string) {
  return [
    { name: 'Home', url: SITE },
    { name: 'Categories', url: SITE + '/categories' },
    { name: categoryName, url: SITE + '/' + categorySlug },
  ];
}

export function shopBreadcrumb() {
  return [
    { name: 'Home', url: SITE },
    { name: 'Shop', url: SITE + '/shop' },
  ];
}

export function categoriesBreadcrumb() {
  return [
    { name: 'Home', url: SITE },
    { name: 'Categories', url: SITE + '/categories' },
  ];
}
