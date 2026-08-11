import sharp from 'sharp';

const FAPIHUB_API = 'https://fapihub.com/v2/rembg/';

// Model secenekleri: 'falcon' | 'aurora' | 'ghost'
// Tuylu/kivircik gorsellerde farkli modeller farkli sonuc verir
const FAPIHUB_MODEL = process.env.FAPIHUB_MODEL || 'falcon';

/**
 * Gorseli 3000x3000'e buyutur, arka planini kaldirir, PNG doner.
 */
export async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  const t0 = Date.now();

  // 1. Once 3000x3000'e buyut (daha temiz kenar icin)
  const upscaled = await sharp(inputBuffer)
    .resize(3000, 3000, {
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  // 2. FAPIhub'a gonder
  const apiKey = process.env.FAPIHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FAPIHUB_API_KEY tanimli degil');
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(upscaled)], { type: 'image/png' });
  form.append('image', blob, 'input.png');
  form.append('model', FAPIHUB_MODEL);

  const res = await fetch(FAPIHUB_API, {
    method: 'POST',
    headers: {
      ApiKey: apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch (e) {
      detail = 'detay okunamadi';
    }
    throw new Error('FAPIhub hatasi ' + res.status + ': ' + detail);
  }

  // 3. Binary PNG olarak gelir
  const arrayBuf = await res.arrayBuffer();
  const out = Buffer.from(arrayBuf);

  const secs = Math.round((Date.now() - t0) / 100) / 10;
  console.log(
    '[fapihub] model=' + FAPIHUB_MODEL +
    ' sure=' + secs + 's' +
    ' giris=' + Math.round(upscaled.length / 1024) + 'KB' +
    ' cikis=' + Math.round(out.length / 1024) + 'KB'
  );

  if (out.length < 5000) {
    throw new Error('FAPIhub cok kucuk dosya dondu (' + out.length + ' byte), muhtemelen hata');
  }

  return out;
}
