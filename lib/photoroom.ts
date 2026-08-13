import sharp from 'sharp';

const FAPIHUB_API = 'https://fapihub.com/v2/rembg/';
const FAPIHUB_MODEL = process.env.FAPIHUB_MODEL || 'falcon';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function buildUploadBuffer(input: Buffer): Promise<{ buf: Buffer; note: string }> {
  const attempts = [
    { size: 2400, quality: 90 },
    { size: 2048, quality: 85 },
    { size: 1600, quality: 82 },
  ];

  for (const a of attempts) {
    const buf = await sharp(input)
      .resize(a.size, a.size, { fit: 'inside', withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: a.quality, mozjpeg: true })
      .toBuffer();
    if (buf.length <= MAX_UPLOAD_BYTES) {
      return { buf, note: a.size + 'px/q' + a.quality + '/' + Math.round(buf.length / 1024) + 'KB' };
    }
  }

  const buf = await sharp(input)
    .resize(1200, 1200, { fit: 'inside' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return { buf, note: '1200px/q78/fallback' };
}

export async function removeBackground(inputBuffer: Buffer): Promise<Buffer> {
  const t0 = Date.now();

  const apiKey = process.env.FAPIHUB_API_KEY;
  if (!apiKey) throw new Error('FAPIHUB_API_KEY tanimli degil');

  const { buf: upload, note } = await buildUploadBuffer(inputBuffer);

  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(upload)], { type: 'image/jpeg' }), 'input.jpg');
  form.append('model', FAPIHUB_MODEL);

  const res = await fetch(FAPIHUB_API, {
    method: 'POST',
    headers: { ApiKey: apiKey },
    body: form,
  });

  const contentType = res.headers.get('content-type') || '';
  const arrayBuf = await res.arrayBuffer();
  const out = Buffer.from(arrayBuf);

  if (!res.ok) {
    throw new Error(
      'FAPIhub ' + res.status + ' [gonderilen ' + note + ']: ' + out.toString('utf8').slice(0, 250)
    );
  }

  // JSON dondurmus mu kontrol et (binary bekliyoruz)
  if (contentType.includes('json') || (out.length > 0 && out[0] === 0x7b)) {
    throw new Error(
      'FAPIhub binary yerine JSON dondu: ' + out.toString('utf8').slice(0, 250)
    );
  }

  // Gercekten PNG mi?
  if (out.length < 8 || !out.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error(
      'FAPIhub gecerli PNG dondurmedi. ct=' + contentType +
      ' boyut=' + out.length +
      ' ilk16=' + out.subarray(0, 16).toString('hex')
    );
  }

  // Icerik gercekten var mi? (tamamen seffaf PNG kontrolu)
  const meta = await sharp(out).stats();
  const alphaChannel = meta.channels[meta.channels.length - 1];
  if (alphaChannel && alphaChannel.max === 0) {
    throw new Error('FAPIhub tamamen seffaf gorsel dondu (model konuyu bulamadi)');
  }

  const secs = Math.round((Date.now() - t0) / 100) / 10;
  console.log(
    '[fapihub] model=' + FAPIHUB_MODEL + ' ' + note +
    ' -> ' + Math.round(out.length / 1024) + 'KB' +
    ' ct=' + contentType + ' sure=' + secs + 's'
  );

  return out;
}
