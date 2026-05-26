import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(
      '<h2>OAuth callback hatasi</h2><p>code parametresi yok</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token || '(yok - bu hesap zaten yetkilendirilmis olabilir, once Google account permissions"dan kaldir ve tekrar dene)';

    return new Response(
      '<html><body style="font-family:sans-serif;padding:40px;max-width:700px;margin:0 auto;">' +
      '<h2 style="color:#080;">OAuth basarili!</h2>' +
      '<p>Asagidaki <strong>Refresh Token</strong> degerini kopyala ve Vercel"de <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> env variable"a koy:</p>' +
      '<pre style="background:#f5f5f5;padding:16px;border-radius:8px;word-break:break-all;white-space:pre-wrap;font-size:13px;">' +
      refreshToken +
      '</pre>' +
      '<p style="color:#888;font-size:13px;">Bu token bir kez alinir ve uzun sure kullanilir. Guvende tut, kimseyle paylasma.</p>' +
      '</body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err: any) {
    return new Response(
      '<h2>OAuth hatasi</h2><pre>' + (err.message || 'bilinmeyen') + '</pre>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
