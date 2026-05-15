import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { buildCategoryMetadata, breadcrumbJsonLd } from '@/lib/seo';
import MasonryGrid from '@/components/MasonryGrid';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export async function generateStaticParams() {
  const { data } = await supabase.from('categories').select('slug');
  return (data || []).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: { category: string } }) {
  const { data: category } = await supabase
    .from('categories').select('*').eq('slug', params.category).single();
  if (!category) return {};
  return buildCategoryMetadata(category);
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const { data: category } = await supabase
    .from('categories').select('*').eq('slug', params.category).single();

  if (!category) notFound();

  const { data: listingCategories } = await supabase
    .from('listing_categories').select('listing_id').eq('category_id', category.id);

  const listingIds = (listingCategories || []).map((lc) => lc.listing_id);

  const { data: listings } = await supabase
    .from('listings').select('*')
    .in('id', listingIds.length > 0 ? listingIds : [0])
    .eq('state', 'active')
    .order('num_favorers', { ascending: false })
    .limit(60);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: category.name, url: `${SITE_URL}/${category.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="pt-10 pb-12 md:pt-16 md:pb-20 border-b border-ink/8 bg-bone">
        <div className="container-x">
          <nav className="text-eyebrow mb-6">
            <Link href="/" className="hover:text-clay">Home</Link>
            <span className="mx-2 text-ink/30">/</span>
            <span>{category.name}</span>
          </nav>

          <div className="max-w-3xl">
            <h1 className="font-display text-display-lg font-light text-balance leading-[0.95]">
              {category.name}
              <em className="italic text-clay">.</em>
            </h1>
            {category.description && (
              <p className="mt-6 text-lg md:text-xl text-ink/70 max-w-2xl leading-relaxed text-pretty">
                {category.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="pill">{category.listing_count}+ designs</span>
              <span className="pill">⭐ Star Seller</span>
              <span className="pill">Instant download</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-x">
          {listings && listings.length > 0 ? (
            <>
              <MasonryGrid listings={listings} priority={4} />
              {listings.length === 60 && (
                <div className="mt-16 text-center">
                  <Link
                    href="https://www.etsy.com/shop/SuzyFlowArt/items"
                    target="_blank"
                    rel="noopener"
                    className="button-primary"
                  >
                    See all {category.listing_count}+ on Etsy →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-24 text-ink/50">Listings syncing — check back soon!</p>
          )}
        </div>
      </section>

      <section className="py-12 border-t border-ink/8 bg-bone">
        <div className="container-x max-w-3xl">
          <h2 className="font-display text-2xl md:text-3xl font-light text-balance mb-4">
            About this collection
          </h2>
          <div className="text-ink/80 leading-relaxed space-y-3">
            <p>
              {category.description} Each design is hand-painted by Suzan, scanned at high resolution,
              and prepared as instant digital downloads.
            </p>
            <p>
              Use them for junk journals, greeting cards, wall art, sublimation prints, scrapbooking,
              and any creative project. All purchases happen securely on Etsy with our Star Seller guarantee.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
