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

export function generateUniqueDescription(listing: Listing): string {
  const title = listing.title.replace(/\s*[-|:].*$/, '').trim();
  const topTags = (listing.tags || []).slice(0, 4).join(', ');
  const fav = listing.num_favorers > 5 ? ' Loved by ' + listing.num_favorers + '+ Etsy shoppers.' : '';
  const priceStr = listing.price ? ' Just $' + listing.price.toFixed(2) + '.' : '';
  const themes = topTags ? 'Themes: ' + topTags + '. ' : '';
  return (
    title + ' — a watercolor clipart design available as an instant digital download. ' +
    'Perfect for junk journals, greeting cards, wall prints, t-shirt designs, stickers, and scrapbooking. ' +
    'High-resolution PNG with transparent background.' + priceStr + fav + ' ' +
    themes +
    'Buy securely on Etsy from the SuzyFlowArt Star Seller shop.'
  ).slice(0, 300);
}

export function generateAltText(listing: Listing, variant?: number): string {
  const cleanTitle = listing.title.replace(/\s*[-|:].*$/, '').trim().slice(0, 70);
  const suffix = 'watercolor clipart transparent PNG instant download';
  if (variant && variant > 0) {
    return cleanTitle + ' — view ' + (variant + 1) + ' — ' + suffix;
  }
  return cleanTitle + ' — ' + suffix;
}

export function buildListingMetadata(listing: Listing): Metadata {
  const cleanTitle = listing.title.slice(0, 60);
  const title = cleanTitle + ' | Watercolor Clipart PNG';
  const description = generateUniqueDescription(listing);
  const image = listing.main_image_url || SITE_URL + '/og-default.jpg';
  const url = SITE_URL + '/listing/' + listing.slug;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 570, height: 570, alt: generateAltText(listing) }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    keywords: [
      ...(listing.tags?.slice(0, 12) || []),
      'watercolor clipart', 'PNG download', 'digital download', 'instant download',
    ],
  };
}

export function buildCategoryMetadata(category: Category): Metadata {
  const title = category.seo_title || category.name + ' Watercolor Clipart | ' + category.listing_count + '+ PNG Designs';
  const description = category.seo_description ||
    'Browse ' + category.listing_count + '+ ' + category.name.toLowerCase() + ' watercolor clipart designs. ' +
    'Instant PNG downloads with transparent backgrounds. Perfect for junk journals, cards, prints, and crafts. ' +
    'Available on Etsy from a Star Seller shop.';
  const url = SITE_URL + '/' + category.slug;
  const image = category.hero_image_url || SITE_URL + '/og-default.jpg';
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: category.name + ' watercolor clipart collection' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export function productJsonLd(listing: Listing) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: generateUniqueDescription(listing),
    image: listing.main_image_url ? [listing.main_image_url] : [],
    sku: String(listing.id),
    brand: { '@type': 'Brand', name: 'SuzyFlowArt' },
    category: 'Digital Art > Clipart',
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
      bestRating: '5',
      worstRating: '1',
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
    logo: SITE_URL + '/logo.png',
    description: 'AI-crafted watercolor clipart collection. 1,600+ designs available on Etsy.',
    sameAs: [
      'https://www.etsy.com/shop/SuzyFlowArt',
      'https://www.instagram.com/suzyflowart',
      'https://www.pinterest.com/suzyflowart',
    ],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Watercolor Clipart',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: SITE_URL + '/shop?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}
