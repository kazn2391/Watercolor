import sharp from 'sharp';

/**
 * Verilen image buffer'i 4032x4032 JPG'ye buyutur, en yuksek kalitede.
 * MJ'den indirilen 1000x1000 dosyalari production-ready hale getirir.
 */
export async function upscaleToJpeg(imageBuffer: Buffer): Promise<Buffer> {
  const result = await sharp(imageBuffer)
    .resize(4032, 4032, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
    })
    .toBuffer();
  return result;
}

/**
 * SEO title'dan kisa, slug-friendly baseName uretir.
 * Sayilari, pipe karakterini ve generic SEO kelimelerini temizler.
 * Sonuc 1-2 kelime, kucuk harf, bosluk yok.
 *
 * Ornekler:
 *   "3 Whimsical Cat Clipart | Watercolor PNG"  -> "whimsicalcat"
 *   "20 Tropical Sunglasses Beach Clipart"      -> "tropicalsunglasses"
 *   "15 Birthday Cake Watercolor Digital"       -> "birthdaycake"
 */
export function buildBaseNameFromTitle(title: string): string {
  const generic = new Set([
    'clipart', 'png', 'jpg', 'jpeg', 'svg',
    'watercolor', 'watercolour',
    'digital', 'download', 'instant',
    'printable', 'print', 'commercial',
    'bundle', 'set', 'pack', 'collection',
    'transparent', 'background',
    'art', 'design', 'designs', 'illustration', 'illustrations',
    'high', 'resolution', 'hd', 'quality',
    'use', 'craft', 'crafting', 'sublimation',
    'file', 'files', 'pdf',
    'and', 'the', 'for', 'with', 'of', 'in', 'on',
  ]);

  const firstSegment = title.split('|')[0] || title;

  const tokens = firstSegment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .filter((t) => !/^\d+$/.test(t))
    .filter((t) => !generic.has(t));

  const meaningful = tokens.slice(0, 2).join('');

  if (meaningful.length < 3) {
    return 'design';
  }

  return meaningful.slice(0, 30);
}
