import sharp from 'sharp';

/**
 * Verilen image buffer'i 4032x4032 JPG'ye buyutur, en yuksek kalitede.
 * MJ'den indirilen 1000x1000 dosyalari production-ready hale getirir.
 *
 * Debug: hata atarsa input boyutu, sharp metadata ve gercek mesaj fırlatır.
 */
export async function upscaleToJpeg(imageBuffer: Buffer): Promise<Buffer> {
  try {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Input buffer bos veya null (length=' + (imageBuffer ? imageBuffer.length : 0) + ')');
    }

    let metadata: any = null;
    try {
      metadata = await sharp(imageBuffer).metadata();
    } catch (metaErr: any) {
      throw new Error('sharp metadata okumadi (input ' + imageBuffer.length + ' byte): ' + (metaErr.message || 'bilinmeyen'));
    }

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error('Metadata gecersiz: ' + JSON.stringify(metadata).slice(0, 200));
    }

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

    if (!result || result.length === 0) {
      throw new Error('Output buffer bos (input ' + metadata.width + 'x' + metadata.height + ', format=' + metadata.format + ')');
    }

    return result;
  } catch (err: any) {
    // Bu hata processBatch'te yutulmustu, simdi mesaji ile firlatiyor
    throw new Error('upscaleToJpeg HATA: ' + (err.message || 'bilinmeyen') + ' | inputLen=' + (imageBuffer ? imageBuffer.length : 0));
  }
}

/**
 * SEO title'dan kisa, slug-friendly baseName uretir.
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
