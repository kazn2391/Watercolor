import Link from 'next/link';
import Image from 'next/image';
import type { Listing } from '@/lib/supabase';
import { generateAltText } from '@/lib/seo';
import PinShareButton from './PinShareButton';

export default function ListingCard({ listing, index = 0, priority = false }: { listing: Listing; index?: number; priority?: boolean }) {
  const tiltClass = index % 3 === 0 ? '' : index % 3 === 1 ? 'tilt-left' : 'tilt-right';
  const altText = generateAltText(listing);

  return (
    <article className={`masonry-item group hover-pop ${tiltClass}`}>
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="relative overflow-hidden rounded-2xl bg-bone shadow-sm group-hover:shadow-2xl transition-shadow duration-500">
          {listing.main_image_url ? (
            <div className="relative">
              <Image
                src={listing.main_image_url}
                alt={altText}
                width={570}
                height={570}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 20vw"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                priority={priority}
              />
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center text-ink/30 text-xs bg-bone">
              No image
            </div>
          )}

          {listing.on_sale && listing.discount_percent && (
            <div className="absolute top-3 left-3 badge">−{listing.discount_percent}%</div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
            <div className="flex justify-end">
              <PinShareButton listing={listing} compact />
            </div>
            <div className="text-cream text-xs font-medium line-clamp-2 leading-snug">
              {listing.title}
            </div>
          </div>
        </div>

        <div className="mt-3 px-1">
          <h3 className="text-sm text-ink leading-snug line-clamp-2 group-hover:text-clay transition-colors">
            {listing.title}
          </h3>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {listing.on_sale && listing.original_price && (
                <span className="text-ink/40 line-through mr-1.5 text-xs font-normal">
                  ${listing.original_price.toFixed(2)}
                </span>
              )}
              ${listing.price?.toFixed(2)}
            </p>
            {listing.num_favorers > 5 && (
              <span className="text-[10px] text-ink/50 flex items-center gap-1">
                <span className="text-clay">♥</span> {listing.num_favorers}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
