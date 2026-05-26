import { google } from 'googleapis';
import { Readable } from 'stream';

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL veya GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tanimsiz');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return auth;
}

function getDrive() {
  const auth = getAuthClient();
  return google.drive({ version: 'v3', auth });
}

/**
 * Drive klasorunun adini degistirir.
 */
export async function renameDriveFolder(folderId: string, newName: string): Promise<void> {
  const drive = getDrive();

  const safeName = newName
    .replace(/[\\/:*?"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);

  await drive.files.update({
    fileId: folderId,
    requestBody: {
      name: safeName,
    },
  });
}

/**
 * Drive klasorunun mevcut adini doner.
 */
export async function getDriveFolderName(folderId: string): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'name',
  });
  return res.data.name || '';
}

/**
 * Drive klasorunun parent klasorunu doner.
 */
export async function getDriveFolderParent(folderId: string): Promise<string | null> {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'parents',
  });
  const parents = res.data.parents;
  if (!parents || parents.length === 0) return null;
  return parents[0];
}

/**
 * Verilen parent klasorun icinde yeni bir alt klasor olusturur.
 * Eger aynı isimde alt klasor varsa onun ID'sini doner (yenisini olusturmaz).
 * Doner: yeni veya mevcut alt klasor ID'si
 */
export async function createOrGetSubfolder(parentFolderId: string, subfolderName: string): Promise<string> {
  const drive = getDrive();

  // Once mevcut mu kontrol et
  const safeName = subfolderName.replace(/['"]/g, '');
  const query = "'" + parentFolderId + "' in parents and name='" + safeName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    const existingId = listRes.data.files[0].id;
    if (existingId) return existingId;
  }

  // Yoksa olustur
  const createRes = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  if (!createRes.data.id) {
    throw new Error('Alt klasor olusturulamadi');
  }
  return createRes.data.id;
}

/**
 * Verilen klasore PNG dosyasi yukler.
 */
export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = 'image/png'
): Promise<string> {
  const drive = getDrive();

  const safeName = fileName.replace(/[\\/:*?"<>]/g, '-').slice(0, 240);

  const stream = Readable.from(fileBuffer);

  const res = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  });

  if (!res.data.id) {
    throw new Error('Dosya yuklenemedi: ' + fileName);
  }
  return res.data.id;
}
