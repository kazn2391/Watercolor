import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'All Categories — Watercolor Clipart Collections',
  description: 'Browse all watercolor clipart categories: cats, women art, peeking animals, mystic illustrations.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const { data: categories } = await supabase.from('categories').select('*').order('display_order');

  return (
    <>
      <section className="pt-10 pb-12 md:pt-16 md:pb-20 border-b border-ink/8 bg-bone">
        <div className="container-x">
          <p className="text-eyebrow mb-4">Categories</p>
          <h1 className="font-display text-display-lg font-light text-balance leading-[0.95]">
            Sixteen <em className="italic text-clay">worlds</em><br />
            of watercolor.
          </h1>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-x">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {categories?.map((cat, i) => (
              <Link key={cat.id} href={`/${cat.slug}`}
                className={`group relative aspect-[4/5] overflow-hidden rounded-3xl bg-cream hover-pop ${
                  i % 3 === 0 ? 'tilt-left' : i % 3 === 2 ? 'tilt-right' : ''
                }`}>
                {cat.hero_image_url && (
                  <Image src={cat.hero_image_url} alt={cat.name} fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-cream">
                  <p className="text-cream/70 text-xs uppercase tracking-wider mb-1">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-light">{cat.name}</h2>
                  <p className="text-xs mt-1 text-cream/80">{cat.listing_count}+ designs</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
