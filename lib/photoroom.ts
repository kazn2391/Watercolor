const PHOTOROOM_API = 'https://sdk.photoroom.com/v1/segment';

/**
 * JPG/PNG buffer'i Photoroom'a yollar, transparent PNG buffer doner.
 * Sandbox key kullaniliyorsa cikti FILIGRANLI olur, test icin ok.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) {
    throw new Error('PHOTOROOM_API_KEY tanimsiz');
  }

  // multipart/form-data ile gonderim
  const boundary = '----PhotoroomBoundary' + Date.now();
  const headerPart =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="image_file"; filename="input.jpg"\r\n' +
    'Content-Type: image/jpeg\r\n\r\n';
  const footerPart = '\r\n--' + boundary + '--\r\n';

  const body = Buffer.concat([
    Buffer.from(headerPart, 'utf-8'),
    imageBuffer,
    Buffer.from(footerPart, 'utf-8'),
  ]);

  const res = await fetch(PHOTOROOM_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Accept': 'image/png',
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
  return Buffer.from(arrayBuffer);
}
