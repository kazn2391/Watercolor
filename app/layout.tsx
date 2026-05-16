import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.watercolorclipart.org';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Watercolor Clipart — AI-Crafted Digital Art by SuzyFlowArt',
    template: '%s | Watercolor Clipart',
  },
  description:
    'Browse 1,600+ AI-crafted watercolor clipart designs. Cats, women art, peeking animals, mystic illustrations, and whimsical digital downloads for crafters, designers, and creative projects.',
  keywords: [
    'watercolor clipart', 'cat clipart', 'woman watercolor art',
    'peeking animal clipart', 'whimsical clipart', 'junk journal',
    'digital download', 'PNG clipart', 'printable art',
  ],
  authors: [{ name: 'SuzyFlowArt' }],
  creator: 'SuzyFlowArt',
  publisher: 'SuzyFlowArt',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Watercolor Clipart',
    title: 'Watercolor Clipart — AI-Crafted Digital Art',
    description: '1,600+ AI-crafted watercolor clipart designs by SuzyFlowArt. Instant digital downloads.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watercolor Clipart',
    description: '1,600+ AI-crafted watercolor designs by SuzyFlowArt',
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="canonical" href={SITE_URL} />
        <meta name="google-site-verification" content="SRo04_QyIqQjBqZlovlY9AJyIpcRXuVR6rayrlYFhmI" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className="font-sans paper-bg min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
