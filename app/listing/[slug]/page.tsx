import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { buildListingMetadata, productJsonLd, breadcrumbJsonLd, stripHtml, generateAltText, generateUniqueDescription } from '@/lib/seo';
import ListingCard from '@/components/ListingCard';
import PinShareButton from '@/components/PinShareButton';

export const revalidate = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: listing } = await supabase.from('listings').select('*').eq('slug', params.slug).single();
  if (!listing) return {};
  return buildListingMetadata(listing);
}

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const { data: listing } = await supabase.from('listings').select('*').eq('slug', params.slug).single();
  if (!listing) notFound();

  const { data: categoryLinks } = await supabase
    .from('listing_categories').select('categories(id, name, slug)').eq('listing_id', listing.id);

  const categories = (categoryLinks || []).map((cl: any) => cl.categories).filter(Boolean);
  const firstCategory = categories[0];

  const { data: relatedLinks } = firstCategory
    ? await supabase.from('listing_categories').select('listings(*)')
        .eq('category_id', firstCategory.id).neq('listing_id', listing.id).limit(8)
    : { data: [] };

  const related = (relatedLinks || []).map((rl: any) => rl.listings).filter(Boolean);

  const jsonLd = productJsonLd(listing);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    ...(firstCategory ? [{ name: firstCategory.name, url: `${SITE_URL}/${firstCategory.slug}` }] : []),
    { name: listing.title, url: `${SITE_URL}/listing/${listing.slug}` },
  ]);

  const uniqueDesc = generateUniqueDescription(listing);
  const etsyDesc = stripHtml(listing.description || '');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <section className="pt-6 md:pt-10 pb-12 md:pb-20">
        <div className="container-x">
          <nav className="text-eyebrow mb-6">
            <Link href="/" className="hover:text-clay">Home</Link>
            {firstCategory && (
              <>
                <span className="mx-2 text-ink/30">/</span>
                <Link href={`/${firstCategory.slug}`} className="hover:text-clay">{firstCategory.name}</Link>
              </>
            )}
            <span className="mx-2 text-ink/30">/</span>
            <span className="text-ink/50">{listing.title.slice(0, 40)}…</span>
          </nav>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="space-y-3">
                {listing.main_image_url && (
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-bone">
                    <Image src={listing.main_image_url} alt={generateAltText(listing)}
                      fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" priority />
                  </div>
                )}
                {Array.isArray(listing.images) && listing.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.images.slice(0, 8).map((img: any, i: number) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-bone">
                        <Image src={img.url} alt={generateAltText(listing, i)}
                          fill sizes="200px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-28 self-start">
              {listing.on_sale && listing.discount_percent && (
                <div className="badge mb-4">−{listing.discount_percent}% Off</div>
              )}

              <h1 className="font-display text-3xl md:text-4xl font-light text-balance leading-tight">
                {listing.title}
              </h1>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-4xl text-ink">${listing.price?.toFixed(2)}</span>
                {listing.on_sale && listing.original_price && (
                  <span className="text-ink/40 line-through text-lg">${listing.original_price.toFixed(2)}</span>
                )}
              </div>
              <p className="text-eyebrow mt-1">{listing.currency_code} · Instant digital download</p>

              <div className="mt-8 space-y-3">
                <a href={listing.etsy_url} target="_blank" rel="noopener" className="button-primary w-full text-base !py-4">
                  Buy on Etsy →
                </a>
                <PinShareButton listing={listing} />
              </div>

              <p className="mt-4 text-xs text-ink/50 text-center">
                Secure checkout · Star Seller shop · Instant access after purchase
              </p>

              <div className="mt-10 pt-8 border-t border-ink/10">
                <p className="text-eyebrow mb-3">About this design</p>
                <p className="text-ink/80 leading-relaxed">{uniqueDesc}</p>
              </div>

              {etsyDesc && etsyDesc.length > 50 && (
                <div className="mt-8 pt-6 border-t border-ink/10">
                  <p className="text-eyebrow mb-3">Full details</p>
                  <p className="text-ink/70 text-sm leading-relaxed whitespace-pre-line line-clamp-[12]">
                    {etsyDesc.slice(0, 1000)}{etsyDesc.length > 1000 ? '…' : ''}
                  </p>
                </div>
              )}

              {listing.tags && listing.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-ink/10">
                  <p className="text-eyebrow mb-3">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.slice(0, 13).map((tag: string) => (
                      <span key={tag} className="pill">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 md:py-20 border-t border-ink/8 bg-bone">
          <div className="container-x">
            <p className="text-eyebrow mb-3">You might also love</p>
            <h2 className="font-display text-3xl md:text-4xl font-light mb-10 text-balance">
              More <em className="italic text-clay">{firstCategory?.name.toLowerCase()}</em>
            </h2>
            <div className="masonry-grid">
              {related.map((r, i) => (
                <ListingCard key={r.id} listing={r} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
