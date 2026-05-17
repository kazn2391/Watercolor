export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveFolderContents {
  folderId: string;
  files: DriveFile[];
  images: DriveFile[];
  hasPdf: boolean;
  imageCount: number;
}

export function extractFolderId(url: string): string | null {
  const m1 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

export async function readDriveFolder(folderUrl: string): Promise<DriveFolderContents> {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) throw new Error('Gecersiz Drive klasor linki');

  const viewUrl = 'https://drive.google.com/embeddedfolderview?id=' + folderId + '#list';
  const res = await fetch(viewUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('Drive klasorune erisilemedi (herkese acik mi?): ' + res.status);

  const html = await res.text();
  const files: DriveFile[] = [];
  const seen = new Set<string>();

  const idRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    const fid = m[1];
    if (seen.has(fid)) continue;
    seen.add(fid);
    files.push({ id: fid, name: '', mimeType: '' });
  }

  const titleRegex = /flip-entry-title[^>]*>([^<]+)</g;
  const names: string[] = [];
  while ((m = titleRegex.exec(html)) !== null) {
    names.push(m[1].trim());
  }
  for (let i = 0; i < files.length && i < names.length; i++) {
    files[i].name = names[i];
    const lower = names[i].toLowerCase();
    if (lower.endsWith('.png')) files[i].mimeType = 'image/png';
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) files[i].mimeType = 'image/jpeg';
    else if (lower.endsWith('.pdf')) files[i].mimeType = 'application/pdf';
    else files[i].mimeType = 'application/octet-stream';
  }

  const images = files.filter(
    (f) => f.mimeType === 'image/png' || f.mimeType === 'image/jpeg'
  );
  const hasPdf = files.some((f) => f.mimeType === 'application/pdf');

  return { folderId, files, images, hasPdf, imageCount: images.length };
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const url = 'https://drive.google.com/uc?export=download&id=' + fileId;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('Dosya indirilemedi: ' + fileId);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function getDriveThumbnail(fileId: string): Promise<string> {
  const url = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('Thumbnail alinamadi: ' + fileId);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}
