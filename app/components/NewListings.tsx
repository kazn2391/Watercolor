type Listing = {
  listing_id: number;
  title: string;
  url: string;
  image_url: string;
  price: string | null;
  num_favorers: number;
  created_at_etsy: string | null;
};

type Props = {
  listings: Listing[];
};

export default function NewListings({ listings }: Props) {
  if (!listings || listings.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-12">
          <div>
            <p className="text-eyebrow mb-3">Fresh from the studio</p>
            <h2 className="font-display text-display-md font-light text-balance leading-tight">
              Just <em className="italic text-clay">added.</em>
            </h2>
          </div>
          
            href="https://www.etsy.com/shop/SuzyFlowArt"
            target="_blank"
            rel="noopener noreferrer"
            className="button-ghost"
          >
            View all new designs
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {listings.map((listing) => (
            
              key={listing.listing_id}
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="aspect-square overflow-hidden rounded-2xl bg-cream mb-3">
                {listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <h3 className="text-sm text-ink line-clamp-2 group-hover:text-clay transition-colors">
                {listing.title}
              </h3>
              {listing.price ? (
                <p className="text-sm font-medium text-ink/70 mt-1">
                  {listing.price}
                </p>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
