import { google } from 'googleapis';

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
 * Service Account ile parent klasor icinde alt klasor olusturur (varsa olanin ID'sini doner).
 * Quota gerektirmez cunku sadece klasor metadatasi, dosya degil.
 */
export async function serviceCreateOrGetSubfolder(parentFolderId: string, subfolderName: string): Promise<string> {
  const drive = getDrive();

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

  const createRes = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  if (!createRes.data.id) {
    throw new Error('Service Account alt klasor olusturulamadi');
  }
  return createRes.data.id;
}

/**
 * Service Account ile bir dosyayi mevcut parent'tan baska bir klasore tasir.
 * Quota gerektirmez cunku sadece parents field'i guncelleniyor.
 * Editor yetkisi yeterli.
 */
export async function serviceMoveFile(fileId: string, fromParentId: string, toParentId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.update({
    fileId,
    addParents: toParentId,
    removeParents: fromParentId,
    fields: 'id, parents',
  });
}
