import { getCachedNewListings } from '@/lib/etsy-new-listings';

export default async function NewListings() {
  const listings = await getCachedNewListings(12);

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Fresh from the Studio
            </h2>
            <p className="text-gray-600 mt-2">
              Newest watercolor clipart added to my shop
            </p>
          </div>
          
            href="https://www.etsy.com/shop/SuzyFlowArt?section_id=53910331"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-block text-sm font-medium text-gray-900 hover:text-pink-600 underline"
          >
            View all on Etsy →
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            
              key={listing.listing_id}
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 mb-2">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
              </div>
              <h3 className="text-sm text-gray-900 line-clamp-2 group-hover:text-pink-600">
                {listing.title}
              </h3>
              {listing.price && (
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {listing.price}
                </p>
              )}
            </a>
          ))}
        </div>

        <div className="text-center mt-8 md:hidden">
          
            href="https://www.etsy.com/shop/SuzyFlowArt?section_id=53910331"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-pink-600 underline"
          >
            View all on Etsy →
          </a>
        </div>
      </div>
    </section>
  );
}
