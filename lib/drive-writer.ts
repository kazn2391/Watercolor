import { google } from 'googleapis';

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL veya GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tanimsiz');
  }

  // Vercel env'de \n karakterleri text olarak geliyor, gercek newline'a cevir
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
 * folderId: yeniden adlandirilacak klasor ID'si
 * newName: yeni isim (orn: "1435 - 20 Cat Clipart | Watercolor PNG")
 */
export async function renameDriveFolder(folderId: string, newName: string): Promise<void> {
  const drive = getDrive();

  // Klasor adlarinda problem yaratabilecek karakterleri temizle
  const safeName = newName
    .replace(/[\\/:*?"<>]/g, '-')  // Drive icin guvensiz karakterler
    .replace(/\s+/g, ' ')           // Cift bosluklari tekle
    .trim()
    .slice(0, 240);                  // 255 karakter sinirini ihlal etme

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
 * Drive klasorunun parent klasorunu doner (kontrol icin).
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
