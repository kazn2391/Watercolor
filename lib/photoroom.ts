import sharp from 'sharp';

const PHOTOROOM_API = 'https://sdk.photoroom.com/v1/segment';

/**
 * JPG/PNG buffer'i Photoroom'a yollar, transparent PNG buffer doner.
 * Input'u once 3000x3000 boyutuna sharp ile buyutur, sonra Photoroom'a yollar.
 * Boylece cikti da 3000x3000 olur. Sandbox key kullaniliyorsa cikti FILIGRANLI olur.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    throw new Error('PHOTOROOM_API_KEY tanimsiz');
  }

  const tStart = Date.now();

  // ADIM 1: Input'u 3000x3000'e buyut (sharp lanczos3 ile)
  const t1 = Date.now();
  let upscaledInput: Buffer;
  try {
    upscaledInput = await sharp(imageBuffer)
      .resize(3000, 3000, {
        fit: 'inside',
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (err: any) {
    throw new Error('Photoroom prep (sharp) hatasi: ' + (err.message || 'bilinmeyen'));
  }
  const t1End = Date.now();
  console.log('[Photoroom] Sharp upscale (3000x3000): ' + (t1End - t1) + 'ms, ' + Math.round(upscaledInput.length / 1024) + ' KB');

  // ADIM 2: Photoroom API'ye yolla
  const t2 = Date.now();
  const boundary = '----PhotoroomBoundary' + Date.now();
  const headerPart =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="image_file"; filename="input.jpg"\r\n' +
    'Content-Type: image/jpeg\r\n\r\n';
  const footerPart = '\r\n--' + boundary + '--\r\n';

  const body = Buffer.concat([
    Buffer.from(headerPart, 'utf-8'),
    upscaledInput,
    Buffer.from(footerPart, 'utf-8'),
  ]);

  const res = await fetch(PHOTOROOM_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Accept': 'image/png',
      'pr-hd-background-removal': 'auto', // HD background removal (2K+ icin onerilir)
    },
    body,
  });

  if (!res.ok) {
    let errMsg = '';
    try {
      errMsg = await res.text();
    } catch (e) {
      errMsg = 'unknown';
    }
    throw new Error('Photoroom API hatasi (' + res.status + '): ' + errMsg.slice(0, 200));
  }

  const arrayBuffer = await res.arrayBuffer();
  const outputBuffer = Buffer.from(arrayBuffer);
  const t2End = Date.now();
  console.log('[Photoroom] API call: ' + (t2End - t2) + 'ms, output ' + Math.round(outputBuffer.length / 1024) + ' KB');
  console.log('[Photoroom] TOPLAM: ' + (t2End - tStart) + 'ms');

  return outputBuffer;
}
