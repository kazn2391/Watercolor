import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import MasonryGrid from '@/components/MasonryGrid';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop All Watercolor Clipart — 1,600+ Designs',
  description: 'Browse the entire collection of 1,600+ watercolor clipart designs by SuzyFlowArt.',
  alternates: { canonical: '/shop' },
};

const PAGE_SIZE = 60;

export default async function ShopPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: listings, count } = await supabase
    .from('listings').select('*', { count: 'exact' })
    .eq('state', 'active').order('num_favorers', { ascending: false }).range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  return (
    <>
      <section className="pt-10 pb-12 md:pt-16 md:pb-20 border-b border-ink/8 bg-bone">
        <div className="container-x">
          <p className="text-eyebrow mb-4">All designs</p>
          <h1 className="font-display text-display-lg font-light text-balance leading-[0.95]">
            The whole <em className="italic text-clay">vibe.</em>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink/70 max-w-2xl leading-relaxed">
            <strong>{count?.toLocaleString()}+</strong> hand-painted watercolor designs.
            All instant downloads. All available on Etsy.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-x">
          {listings && listings.length > 0 ? (
            <>
              <MasonryGrid listings={listings} priority={4} />
              {totalPages > 1 && (
                <nav className="mt-16 flex items-center justify-between border-t border-ink/10 pt-8">
                  {page > 1 ? (
                    <Link href={`/shop?page=${page - 1}`} className="button-ghost">← Previous</Link>
                  ) : <span />}
                  <p className="text-eyebrow">Page {page} of {totalPages}</p>
                  {page < totalPages ? (
                    <Link href={`/shop?page=${page + 1}`} className="button-ghost">Next →</Link>
                  ) : <span />}
                </nav>
              )}
            </>
          ) : (
            <p className="text-center py-24 text-ink/50">Listings syncing — come back soon!</p>
          )}
        </div>
      </section>
    </>
  );
}
