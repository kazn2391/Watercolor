import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog — Watercolor Clipart Tips, Guides & Ideas',
  description: 'Tutorials and creative ideas for using watercolor clipart in Canva, Cricut, junk journals, wedding invitations, and more.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndex() {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, published_at, tags')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <>
      <section className="pt-10 pb-12 md:pt-16 md:pb-20 border-b border-ink/8 bg-bone">
        <div className="container-x">
          <p className="text-eyebrow mb-4">The Journal</p>
          <h1 className="font-display text-display-lg font-light text-balance leading-[0.95]">
            Tips, guides &amp; <em className="italic text-clay">creative ideas.</em>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink/70 max-w-2xl leading-relaxed">
            Everything you need to make the most of watercolor clipart — Canva tutorials,
            Cricut projects, junk journal inspiration, and more.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container-x">
          {posts && posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.map((post, i) => (
                <Link
                  key={post.slug}
                  href={'/blog/' + post.slug}
                  className={'group block bg-bone rounded-2xl p-6 md:p-8 hover-pop ' + (i % 3 === 1 ? 'tilt-left' : i % 3 === 2 ? 'tilt-right' : '')}
                >
                  <p className="text-eyebrow mb-3">
                    {post.tags && post.tags.length > 0 ? post.tags[0] : 'Guide'}
                  </p>
                  <h2 className="font-display text-2xl font-light leading-snug text-balance group-hover:text-clay transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-4 text-ink/70 text-sm leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                  <p className="mt-5 text-sm font-medium border-b border-ink pb-0.5 inline-block group-hover:text-clay group-hover:border-clay transition-colors">
                    Read more
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-24 text-ink/50">Posts coming soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
