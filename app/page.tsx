import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import MasonryGrid from '@/components/MasonryGrid';

export const revalidate = 60;

export default async function HomePage() {
  const { data: featured } = await supabase
    .from('listings')
    .select('*')
    .eq('state', 'active')
    .order('num_favorers', { ascending: false })
    .limit(40);

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')
    .limit(8);

  const heroImages = featured?.slice(0, 6) || [];

  return (
    <>
      {/* HERO */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 overflow-hidden">
        <div className="container-x">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-7 relative z-10">
              <div className="inline-flex items-center gap-2 bg-bone border border-ink/10 rounded-full px-4 py-1.5 mb-6">
                <span className="text-lg">✨</span>
                <span className="text-xs font-medium tracking-wide text-ink/70">
                  AI-crafted watercolor art · ⭐ Star Seller on Etsy
                </span>
              </div>

              <h1 className="font-display text-display-xl font-light text-balance leading-[0.9]">
                Watercolor that{' '}
                <em className="italic text-clay relative inline-block">
                  pops.
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M2 8 Q50 2 100 6 T198 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </em>
                <br />
                Clipart that <em className="italic">slays.</em>
              </h1>

              <p className="mt-8 text-lg md:text-xl text-ink/70 max-w-xl text-pretty leading-relaxed">
                Over <strong className="text-ink">1,600</strong> AI-crafted watercolor designs —
                peeking kitties, floral women, mystic moons, quirky little weirdos.
                Instant digital downloads, available on Etsy.
              </p>

              <div className="mt-10 flex flex-wrap gap-3 items-center">
                <Link href="/shop" className="button-primary">
                  Explore everything →
                </Link>
                <Link href="/watercolor-cat-clipart" className="pill !py-2.5 !px-5">
                  🐱 Start with cats
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-6 md:gap-10 text-sm">
                <div>
                  <p className="font-display text-2xl text-ink">8,400+</p>
                  <p className="text-eyebrow">happy buyers</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-ink">5.0 ⭐</p>
                  <p className="text-eyebrow">avg rating</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-ink">1,623</p>
                  <p className="text-eyebrow">designs</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-[400px] md:h-[500px] lg:h-[600px]">
              {heroImages.length > 0 && (
                <>
                  {heroImages[0]?.main_image_url && (
                    <div className="absolute top-0 right-0 w-[55%] aspect-square rounded-3xl overflow-hidden shadow-2xl tilt-right hover-pop">
                      <Image src={heroImages[0].main_image_url} alt={heroImages[0].title} fill className="object-cover" priority />
                    </div>
                  )}
                  {heroImages[1]?.main_image_url && (
                    <div className="absolute top-[8%] left-0 w-[40%] aspect-square rounded-3xl overflow-hidden shadow-xl tilt-left hover-pop animate-float">
                      <Image src={heroImages[1].main_image_url} alt={heroImages[1].title} fill className="object-cover" priority />
                    </div>
                  )}
                  {heroImages[2]?.main_image_url && (
                    <div className="absolute top-[42%] left-[18%] w-[45%] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl tilt-right hover-pop">
                      <Image src={heroImages[2].main_image_url} alt={heroImages[2].title} fill className="object-cover" priority />
                    </div>
                  )}
                  {heroImages[3]?.main_image_url && (
                    <div className="absolute bottom-0 right-[8%] w-[42%] aspect-square rounded-3xl overflow-hidden shadow-xl tilt-left hover-pop">
                      <Image src={heroImages[3].main_image_url} alt={heroImages[3].title} fill className="object-cover" />
                    </div>
                  )}
                </>
              )}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose/40 rounded-full blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-sage/30 rounded-full blur-3xl -z-10" />
              <div className="absolute top-1/2 -right-8 w-24 h-24 bg-gold/30 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-12 md:py-16 border-y border-ink/8 bg-bone">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <h2 className="font-display text-3xl md:text-4xl font-light text-balance">
              Pick your <em className="italic text-clay">vibe.</em>
            </h2>
            <Link href="/categories" className="button-ghost">View all collections →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {categories?.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                className="group relative aspect-[5/6] overflow-hidden rounded-2xl bg-cream hover-pop"
              >
                {cat.hero_image_url && (
                  <Image
                    src={cat.hero_image_url}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-cream/70 text-xs uppercase tracking-wider mb-1">
                    {String(i + 1).padStart(2, '0')} · {cat.listing_count}+
                  </p>
                  <h3 className="font-display text-xl md:text-2xl text-cream leading-tight">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MASONRY GRID */}
      <section className="py-16 md:py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-12">
            <div>
              <p className="text-eyebrow mb-3">💫 Most loved</p>
              <h2 className="font-display text-display-md font-light text-balance leading-tight">
                The ones <em className="italic">everyone</em> is pinning.
              </h2>
            </div>
            <Link href="/shop" className="button-ghost">See all 1,600+ →</Link>
          </div>

          {featured && featured.length > 0 ? (
            <MasonryGrid listings={featured} priority={4} />
          ) : (
            <p className="text-center py-24 text-ink/50">
              Listings syncing — come back in a few minutes!
            </p>
          )}
        </div>
      </section>

      {/* HOW IT WORKS - replaces personal story */}
      <section className="py-16 md:py-24 bg-bone">
        <div className="container-x">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-eyebrow mb-4">⚡ How it works</p>
            <h2 className="font-display text-display-md font-light text-balance leading-[1.05]">
              Browse here.<br />
              Buy on <em className="italic text-clay">Etsy.</em><br />
              Download instantly.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-10">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose/40 flex items-center justify-center text-4xl">
                🎨
              </div>
              <h3 className="font-display text-2xl font-light mb-3">01. Browse</h3>
              <p className="text-ink/70 text-sm leading-relaxed">
                Explore 1,600+ AI-crafted watercolor designs sorted into 16 collections.
                Use the masonry grid, save your favorites to Pinterest, find the vibe.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky/40 flex items-center justify-center text-4xl">
                🛒
              </div>
              <h3 className="font-display text-2xl font-light mb-3">02. Buy on Etsy</h3>
              <p className="text-ink/70 text-sm leading-relaxed">
                Tap "Buy on Etsy" to complete checkout in the SuzyFlowArt shop.
                Secure payment, Star Seller protection, every order tracked.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sage/40 flex items-center justify-center text-4xl">
                ⬇️
              </div>
              <h3 className="font-display text-2xl font-light mb-3">03. Download</h3>
              <p className="text-ink/70 text-sm leading-relaxed">
                Files download instantly after checkout. High-res PNG, JPG, and sublimation-ready
                formats. Use them in junk journals, prints, shirts, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-16 md:py-24">
        <div className="container-x">
          <div className="max-w-3xl mb-12">
            <p className="text-eyebrow mb-4">🎯 Perfect for</p>
            <h2 className="font-display text-display-md font-light text-balance leading-tight">
              Designed for <em className="italic text-clay">your projects.</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '📓', label: 'Junk journals' },
              { emoji: '👕', label: 'T-shirt designs' },
              { emoji: '🎂', label: 'Greeting cards' },
              { emoji: '🏠', label: 'Wall prints' },
              { emoji: '📱', label: 'Phone wallpapers' },
              { emoji: '🎁', label: 'Gift wrap' },
              { emoji: '✂️', label: 'Stickers & decals' },
              { emoji: '📚', label: 'Scrapbooks' },
            ].map((item) => (
              <div key={item.label} className="bg-bone rounded-2xl p-5 flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 bg-ink text-cream relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-clay rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-rose rounded-full blur-3xl" />
        </div>

        <div className="container-x relative text-center">
          <p className="text-eyebrow !text-cream/60 mb-6">🎁 Ready to start?</p>
          <h2 className="font-display text-display-lg font-light text-balance max-w-4xl mx-auto leading-[0.95]">
            <em className="italic">Instant downloads.</em><br />
            No waiting. No shipping.<br />
            Just <em className="italic text-clay">art.</em>
          </h2>
          <p className="mt-8 text-cream/70 text-lg max-w-xl mx-auto">
            Every purchase happens securely on Etsy. Files download the second checkout completes.
            Star Seller guarantee included.
          </p>
          <div className="mt-10">
            <Link
              href="https://www.etsy.com/shop/SuzyFlowArt"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 bg-cream text-ink px-8 py-4 rounded-full text-sm font-medium tracking-wide hover:bg-clay hover:text-cream transition-all hover:scale-105"
            >
              Shop on Etsy →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
