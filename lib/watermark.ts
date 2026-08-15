import sharp from 'sharp';

const TEXT = process.env.WATERMARK_TEXT || 'SuzyFlowArt';
const ENABLED = process.env.WATERMARK_ENABLED !== 'false';
const OPACITY = parseFloat(process.env.WATERMARK_OPACITY || '0.11');

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gorselin uzerine cok soluk, tekrarlanan capraz filigran ekler.
 * SADECE Etsy onizleme gorselleri icin - teslim dosyalarina KOYMA.
 */
export async function addWatermark(input: Buffer): Promise<Buffer> {
  if (!ENABLED) return input;

  try {
    const meta = await sharp(input).metadata();
    const w = meta.width || 2000;
    const h = meta.height || 2000;

    const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.030));
    const stepX = Math.round(fontSize * 12);
    const stepY = Math.round(fontSize * 6);
    const safeText = escapeXml(TEXT);

    const padX = Math.round(w * 0.6);
    const padY = Math.round(h * 0.6);

    let nodes = '';
    let row = 0;
    for (let y = -padY; y < h + padY; y += stepY) {
      const offset = row % 2 === 0 ? 0 : Math.round(stepX / 2);
      for (let x = -padX; x < w + padX; x += stepX) {
        nodes += '<text x="' + (x + offset) + '" y="' + y + '">' + safeText + '</text>';
      }
      row++;
    }

    const svg =
      '<svg width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg">' +
      '<g transform="rotate(-30 ' + Math.round(w / 2) + ' ' + Math.round(h / 2) + ')" ' +
      'font-family="Helvetica, Arial, sans-serif" font-size="' + fontSize + '" ' +
      'font-weight="600" letter-spacing="' + Math.round(fontSize * 0.08) + '" ' +
      'fill="#8a8a8a" fill-opacity="' + OPACITY + '">' +
      nodes +
      '</g></svg>';

    return await sharp(input)
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } catch (e: any) {
    console.error('[watermark] hata, orijinal gorsel kullaniliyor:', e.message);
    return input;
  }
}
