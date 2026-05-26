import { google } from 'googleapis';
import { Readable } from 'stream';

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth env variables eksik');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
}

function getDrive() {
  const auth = getOAuthClient();
  return google.drive({ version: 'v3', auth });
}

/**
 * OAuth ile parent klasor icinde alt klasor olusturur (varsa olanin ID'sini doner).
 */
export async function oauthCreateOrGetSubfolder(parentFolderId: string, subfolderName: string): Promise<string> {
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
    throw new Error('OAuth alt klasor olusturulamadi');
  }
  return createRes.data.id;
}

/**
 * OAuth ile dosya yukler.
 */
export async function oauthUploadFileToDrive(
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
    throw new Error('OAuth dosya yuklenemedi: ' + fileName);
  }
  return res.data.id;
}

/**
 * OAuth ile dosya siler (Drive trash'e gonderir).
 */
export async function oauthDeleteFile(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.update({
    fileId,
    requestBody: {
      trashed: true,
    },
  });
}
