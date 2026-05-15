'use client';

import Link from 'next/link';
import { useState } from 'react';

const NAV = [
  { label: 'Cats', href: '/watercolor-cat-clipart', emoji: '🐱' },
  { label: 'Women', href: '/woman-art', emoji: '👩‍🎨' },
  { label: 'Peeking', href: '/peeking-art', emoji: '👀' },
  { label: 'Quirky', href: '/quirky-whimsical', emoji: '✨' },
  { label: 'Mystic', href: '/mystic-religious', emoji: '🌙' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-ink/8">
      <div className="container-x">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:animate-wiggle">🎨</span>
            <span className="font-display text-xl md:text-2xl font-medium tracking-tight">
              Watercolor<em className="italic text-clay">Clipart</em>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-full text-sm text-ink/70 hover:text-clay hover:bg-bone transition-all"
              >
                <span className="mr-1">{item.emoji}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center text-sm text-ink hover:text-clay transition-colors"
            >
              All designs
            </Link>
            <Link
              href="https://www.etsy.com/shop/SuzyFlowArt"
              target="_blank"
              rel="noopener"
              className="button-primary !py-2 !px-4 text-xs"
            >
              Shop Etsy →
            </Link>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden border-t border-ink/8 py-4 flex flex-wrap gap-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="pill"
              >
                <span>{item.emoji}</span>
                {item.label}
              </Link>
            ))}
            <Link href="/shop" onClick={() => setOpen(false)} className="pill">
              All designs
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
