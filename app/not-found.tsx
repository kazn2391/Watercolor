import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-eyebrow mb-4">404</p>
        <h2 className="font-display text-4xl font-light mb-4">
          Lost in the <em className="italic text-clay">watercolors.</em>
        </h2>
        <p className="text-ink/60 mb-8">
          The page you&apos;re looking for got washed away. Let&apos;s find something else.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="bg-ink text-cream px-6 py-3 rounded-full text-sm font-medium hover:bg-clay transition-colors">
            Back home
          </Link>
          <Link href="/shop" className="border border-ink/20 px-6 py-3 rounded-full text-sm font-medium hover:border-clay transition-colors">
            Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}
