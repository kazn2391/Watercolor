const SITE = 'https://www.watercolorclipart.org';

export function OrganizationSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SuzyFlowArt',
    alternateName: 'Watercolor Clipart',
    url: SITE,
    logo: SITE + '/logo.png',
    description: 'AI-crafted watercolor clipart and digital downloads. Over 1,600 designs available on Etsy.',
    sameAs: [
      'https://www.etsy.com/shop/SuzyFlowArt',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'suzanpod@gmail.com',
      contactType: 'customer support',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebsiteSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Watercolor Clipart by SuzyFlowArt',
    url: SITE,
    potentialAction: {
      '@type': 'SearchAction',
      target: SITE + '/shop?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type Product = {
  name: string;
  url: string;
  image: string;
  price?: string;
};

export function ProductListSchema({ products }: { products: Product[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: product.url,
        image: product.image,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
