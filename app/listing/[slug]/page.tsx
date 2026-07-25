export default async function ListingPage({ params }) {
  const listing = await getListing(params.slug); // kendi fonksiyonun

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description?.slice(0, 300),
    image: listing.image_url,
    brand: { '@type': 'Brand', name: 'SuzyFlowArt' },
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://www.etsy.com/listing/${listing.listing_id}`,
      seller: { '@type': 'Organization', name: 'SuzyFlowArt' },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '952',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* mevcut sayfa icerigi */}
    </>
  );
}
