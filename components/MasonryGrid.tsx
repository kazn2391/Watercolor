import type { Listing } from '@/lib/supabase';
import ListingCard from './ListingCard';

export default function MasonryGrid({ listings, priority = 4 }: { listings: Listing[]; priority?: number }) {
  return (
    <div className="masonry-grid">
      {listings.map((listing, i) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          index={i}
          priority={i < priority}
        />
      ))}
    </div>
  );
}
