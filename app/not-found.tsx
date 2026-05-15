import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="py-32 md:py-48">
      <div className="container-x text-center">
        <p className="text-eyebrow mb-4">404 · oops</p>
        <h1 className="font-display text-display-lg font-light text-balance">
          This page is taking <em className="italic text-clay">a watercolor nap.</em>
        </h1>
        <p className="mt-8 text-lg text-ink/70 max-w-md mx-auto">
          The link you followed might be old or broken. Let's get you back to something beautiful.
        </p>
        <div className="mt-10">
          <Link href="/" className="button-primary">Back home →</Link>
        </div>
      </div>
    </section>
  );
}
