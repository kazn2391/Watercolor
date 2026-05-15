import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-ink text-cream/80 mt-24">
      <div className="container-x py-16 md:py-20">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="font-display text-3xl md:text-4xl font-light text-cream text-balance leading-tight">
              Watercolor clipart<br />
              for <em className="italic text-clay">every project.</em>
            </p>
            <p className="mt-4 text-cream/60 max-w-md text-sm leading-relaxed">
              1,600+ AI-crafted watercolor designs. Curated digital art collection,
              available exclusively on Etsy with Star Seller protection.
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-eyebrow !text-cream/50 mb-4">Shop</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop" className="hover:text-clay transition-colors">All clipart</Link></li>
              <li><Link href="/categories" className="hover:text-clay transition-colors">Categories</Link></li>
              <li><Link href="/watercolor-cat-clipart" className="hover:text-clay transition-colors">Cats</Link></li>
              <li><Link href="/woman-art" className="hover:text-clay transition-colors">Women</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-eyebrow !text-cream/50 mb-4">Themes</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/peeking-art" className="hover:text-clay transition-colors">Peeking</Link></li>
              <li><Link href="/quirky-whimsical" className="hover:text-clay transition-colors">Quirky</Link></li>
              <li><Link href="/mystic-religious" className="hover:text-clay transition-colors">Mystic</Link></li>
              <li><Link href="/birthday-celebration" className="hover:text-clay transition-colors">Birthday</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-eyebrow !text-cream/50 mb-4">Connect</p>
            <ul className="space-y-2 text-sm">
              <li><a href="https://www.etsy.com/shop/SuzyFlowArt" target="_blank" rel="noopener" className="hover:text-clay transition-colors">Etsy Shop →</a></li>
              <li><a href="https://www.pinterest.com/suzyflowart" target="_blank" rel="noopener" className="hover:text-clay transition-colors">Pinterest →</a></li>
              <li><a href="https://www.instagram.com/suzyflowart" target="_blank" rel="noopener" className="hover:text-clay transition-colors">Instagram →</a></li>
              <li><a href="mailto:suzanpod@gmail.com" className="hover:text-clay transition-colors">Email us</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-cream/10 flex flex-wrap justify-between gap-4 text-xs text-cream/40">
          <p>© {new Date().getFullYear()} SuzyFlowArt · Watercolor Clipart</p>
          <p>Curated digital art · Star Seller on Etsy</p>
        </div>
      </div>
    </footer>
  );
}
