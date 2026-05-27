import { NextResponse } from 'next/server';
import { getValidEtsyToken, getEtsyApiKeyHeader } from '@/lib/etsy-auth';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (adminKey !== 'Kuzey2391' && adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const shopKey = url.searchParams.get('shop') === '2' ? 'shop2' : 'shop1';
  try {
    const token = await getValidEtsyToken(shopKey);

    // 1) Token'dan user_id'yi cikar - access token formati: "USERID.RESTOFTOKEN"
    // Etsy access token'in basinda user_id rakam olarak duruyor, "." ile ayriliyor.
    let userIdFromToken = '';
    const dotIdx = token.indexOf('.');
    if (dotIdx > 0) {
      userIdFromToken = token.substring(0, dotIdx);
    }

    // 2) /users/me/shops - kullanicinin tum shop'larini doner
    let shopsData: any = null;
    let shopsError = '';
    if (userIdFromToken) {
      try {
        const shopsRes = await fetch(
          'https://api.etsy.com/v3/application/users/' + userIdFromToken + '/shops',
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'x-api-key': getEtsyApiKeyHeader(),
            },
          }
        );
        shopsData = await shopsRes.json();
        if (!shopsRes.ok) {
          shopsError = 'HTTP ' + shopsRes.status;
        }
      } catch (e: any) {
        shopsError = e.message;
      }
    }

    // 3) /shops/{shop_id} - env'deki shop ID dogru mu kontrol
    const savedShopId = shopKey === 'shop2' ? process.env.ETSY2_SHOP_ID : process.env.ETSY_SHOP_ID;
    let shopByIdData: any = null;
    let shopByIdError = '';
    if (savedShopId) {
      try {
        const sRes = await fetch(
          'https://api.etsy.com/v3/application/shops/' + savedShopId,
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'x-api-key': getEtsyApiKeyHeader(),
            },
          }
        );
        shopByIdData = await sRes.json();
        if (!sRes.ok) {
          shopByIdError = 'HTTP ' + sRes.status;
        }
      } catch (e: any) {
        shopByIdError = e.message;
      }
    }

    return NextResponse.json({
      shopKey,
      currentSavedShopId: savedShopId,
      userIdFromToken,
      shopsFromUserId: shopsData,
      shopsError,
      shopByIdLookup: shopByIdData,
      shopByIdError,
      tokenPreview: token.slice(0, 20) + '...',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
