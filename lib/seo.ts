import type { Metadata } from 'next';
import type { Listing, Category } from './supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';
const SITE_NAME = 'Watercolor Clipart';

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildListingMetadata(listing: Listing): Metadata {
  const title = listing.seo_title || `${listing.title} | Watercolor Clipart`;
  const description = listing.seo_description || stripHtml(listing.description || '').slice(0, 160);
  const image = listing.main_image_url || `${SITE_URL}/og-default.jpg`;
  const url = `${SITE_URL}/listing/${listing.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title, description, url, siteName: SITE_NAME,
      images: [{ url: image, width: 570, height: 570, alt: listing.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    keywords: listing.tags?.slice(0, 15),
  };
}

export function buildCategoryMetadata(category: Category): Metadata {
  const title = category.seo_title || `${category.name} Clipart | Watercolor Clipart`;
  const description = category.seo_description ||
    `Browse ${category.listing_count}+ ${category.name.toLowerCase()} watercolor clipart designs.`;
  const url = `${SITE_URL}/${category.slug}`;
  const image = category.hero_image_url || `${SITE_URL}/og-default.jpg`;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website', title, description, url, siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: category.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export function productJsonLd(listing: Listing) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: stripHtml(listing.description || '').slice(0, 500),
    image: listing.main_image_url ? [listing.main_image_url] : [],
    sku: String(listing.id),
    brand: { '@type': 'Brand', name: 'SuzyFlowArt' },
    offers: {
      '@type': 'Offer',
      url: listing.etsy_url,
      priceCurrency: listing.currency_code || 'USD',
      price: listing.price,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'SuzyFlowArt on Etsy' },
    },
    aggregateRating: listing.num_favorers > 5 ? {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: Math.max(listing.num_favorers, 1),
    } : undefined,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Watercolor Clipart',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      'https://www.etsy.com/shop/SuzyFlowArt',
      'https://www.instagram.com/suzyflowart',
      'https://www.pinterest.com/suzyflowart',
    ],
  };
}
