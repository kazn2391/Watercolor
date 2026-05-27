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

    // Etsy /users/me endpoint - aktif kullanicinin shop bilgisini doner
    const res = await fetch('https://api.etsy.com/v3/application/users/me', {
      headers: {
        Authorization: 'Bearer ' + token,
        'x-api-key': getEtsyApiKeyHeader(),
      },
    });
    const data = await res.json();

    // Shops endpoint
    const shopsRes = await fetch('https://api.etsy.com/v3/application/users/' + data.user_id + '/shops', {
      headers: {
        Authorization: 'Bearer ' + token,
        'x-api-key': getEtsyApiKeyHeader(),
      },
    });
    const shopsData = await shopsRes.json();

    return NextResponse.json({
      shopKey,
      currentSavedShopId: shopKey === 'shop2' ? process.env.ETSY2_SHOP_ID : process.env.ETSY_SHOP_ID,
      userMe: data,
      shops: shopsData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
