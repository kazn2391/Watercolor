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
      {/* HERO — bold, görsel kolaj */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 overflow-hidden">
        <div className="container-x">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-7 relative z-10">
              <div className="inline-flex items-center gap-2 bg-bone border border-ink/10 rounded-full px-4 py-1.5 mb-6">
                <span className="text-lg">🎨</span>
                <span className="text-xs font-medium tracking-wide text-ink/70">
                  Hand-painted in Cyprus · ⭐ Star Seller on Etsy
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
                Over <strong className="text-ink">1,600</strong> dreamy designs — peeking kitties,
                floral women, mystic moons, and quirky little weirdos. All hand-painted by humans,
                all instant downloads.
              </p>

              <div className="mt-10 flex flex-wrap gap-3 items-center">
                <Link href="/shop" className="button-primary">
                  Explore everything →
                </Link>
                <Link href="/watercolor-cat-clipart" className="pill !py-2.5 !px-5">
                  🐱 Start with cats
                </Link>
              </div>

              {/* Stats inline */}
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

            {/* Hero collage — 6 images in playful arrangement */}
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
              {/* Decorative blobs */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose/40 rounded-full blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-sage/30 rounded-full blur-3xl -z-10" />
              <div className="absolute top-1/2 -right-8 w-24 h-24 bg-gold/30 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES — playful chip selector */}
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

      {/* MASONRY GRID — main attraction */}
      <section className="py-16 md:py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-12">
            <div>
              <p className="text-eyebrow mb-3">💫 Crowd favorites</p>
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

      {/* ABOUT — story section */}
      <section className="py-16 md:py-24 bg-bone">
        <div className="container-x">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <p className="text-eyebrow mb-4">✍️ The makers</p>
              <h2 className="font-display text-display-md font-light text-balance leading-[1.05]">
                Suzan paints. <br />
                Kursat ships. <br />
                <em className="italic text-clay">It works.</em>
              </h2>
              <div className="mt-8 space-y-4 text-ink/80 text-lg leading-relaxed text-pretty">
                <p>
                  We're a tiny studio on a tiny island (hi from Cyprus 🌊). Suzan paints late at night
                  when the ideas refuse to leave her alone. Kursat keeps the files crisp and the shop running.
                </p>
                <p>
                  Every design here started as actual paint on actual paper. Then scanned, refined,
                  and packed up so you can use them in junk journals, t-shirts, cards, stickers,
                  websites — wherever your project needs a little soft pop of magic.
                </p>
              </div>
              <div className="mt-8">
                <Link href="https://www.etsy.com/shop/SuzyFlowArt/about" target="_blank" rel="noopener" className="button-ghost">
                  Read our full story →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {featured?.slice(8, 14).map((l, i) => (
                  <div
                    key={l.id}
                    className={`relative aspect-square rounded-2xl overflow-hidden bg-cream hover-pop ${
                      i % 3 === 0 ? 'tilt-left' : i % 3 === 1 ? 'tilt-right' : ''
                    } ${i === 1 ? 'translate-y-6' : ''}`}
                  >
                    {l.main_image_url && (
                      <Image
                        src={l.main_image_url}
                        alt={l.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — final push */}
      <section className="py-20 md:py-32 bg-ink text-cream relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-clay rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-rose rounded-full blur-3xl" />
        </div>

        <div className="container-x relative text-center">
          <p className="text-eyebrow !text-cream/60 mb-6">🎁 One last thing</p>
          <h2 className="font-display text-display-lg font-light text-balance max-w-4xl mx-auto leading-[0.95]">
            <em className="italic">Instant downloads.</em><br />
            No waiting. No shipping.<br />
            Just <em className="italic text-clay">art.</em>
          </h2>
          <p className="mt-8 text-cream/70 text-lg max-w-xl mx-auto">
            All purchases happen securely on Etsy. Files download the second you check out.
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
