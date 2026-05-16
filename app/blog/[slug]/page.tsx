import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .single();
  if (!post) return {};
  const url = SITE_URL + '/blog/' + post.slug;
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      url,
      siteName: 'Watercolor Clipart',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
    },
    keywords: post.tags,
  };
}

function renderInline(text: string, keyBase: string) {
  const parts: (string | JSX.Element)[] = [];
  const regex = /<a href="([^"]+)">([^<]+)<\/a>/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Link key={keyBase + '-' + i} href={match[1]} className="text-clay underline underline-offset-2 hover:text-ink transition-colors">
        {match[2]}
      </Link>
    );
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="font-display text-2xl md:text-3xl font-light mt-12 mb-4 text-balance">
          {trimmed.replace('## ', '')}
        </h2>
      );
    } else {
      elements.push(
        <p key={key} className="text-ink/80 leading-relaxed mb-5 text-[17px]">
          {renderInline(trimmed, 'p' + key)}
        </p>
      );
      key++;
    }
  }
  return elements;
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!post) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: 'Watercolor Clipart' },
    publisher: {
      '@type': 'Organization',
      name: 'Watercolor Clipart',
      logo: { '@type': 'ImageObject', url: SITE_URL + '/logo.png' },
    },
    mainEntityOfPage: SITE_URL + '/blog/' + post.slug,
  };

  const { data: morePosts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt')
    .eq('status', 'published')
    .neq('slug', post.slug)
    .limit(3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="py-12 md:py-20">
        <div className="container-x">
          <div className="max-w-3xl mx-auto">
            <nav className="text-eyebrow mb-8">
              <Link href="/" className="hover:text-clay">Home</Link>
              <span className="mx-2 text-ink/30">/</span>
              <Link href="/blog" className="hover:text-clay">Blog</Link>
            </nav>

            <h1 className="font-display text-display-md font-light text-balance leading-[1.05]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-6 text-xl text-ink/70 leading-relaxed text-pretty">
                {post.excerpt}
              </p>
            )}

            <div className="mt-10 pt-10 border-t border-ink/10">
              {renderContent(post.content || '')}
            </div>

            <div className="mt-12 p-8 bg-bone rounded-2xl text-center">
              <p className="font-display text-2xl font-light mb-3">
                Ready to start creating?
              </p>
              <p className="text-ink/70 mb-6 text-sm">
                Browse 1,600+ watercolor clipart designs. Instant download via Etsy.
              </p>
              <Link href="/shop" className="button-primary">
                Explore the collection →
              </Link>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="pill">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {morePosts && morePosts.length > 0 && (
        <section className="py-16 border-t border-ink/8 bg-bone">
          <div className="container-x max-w-3xl mx-auto">
            <p className="text-eyebrow mb-6">Keep reading</p>
            <div className="space-y-4">
              {morePosts.map((p) => (
                <Link
                  key={p.slug}
                  href={'/blog/' + p.slug}
                  className="block group"
                >
                  <h3 className="font-display text-xl font-light group-hover:text-clay transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-ink/60 text-sm mt-1 line-clamp-1">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
