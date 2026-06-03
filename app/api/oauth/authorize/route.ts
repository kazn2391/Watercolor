import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = 'Kuzey2391';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (adminKey !== ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response(
      '<h2>OAuth ENV variables eksik</h2>' +
      '<p>Vercel\'de su 3 variable olmali: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  return NextResponse.redirect(authUrl);
}
