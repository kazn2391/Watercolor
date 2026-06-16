import { NextResponse } from 'next/server';
import { getValidEtsyToken, getEtsyApiKeyHeader, getEtsyShopId } from '@/lib/etsy-auth';

const ETSY_API = 'https://api.etsy.com/v3/application';
const ADMIN_PASSWORD = 'Kuzey2391';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (adminKey !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let listingId: number = 0;
  let newTitle = '';
  let newTags: string[] = [];
  let newDescription = '';
  let shopKey: string = 'shop1';

  try {
    const body = await req.json();
    listingId = parseInt(body.listingId);
    newTitle = body.newTitle || '';
    newTags = Array.isArray(body.newTags) ? body.newTags : [];
    newDescription = body.newDescription || '';
    shopKey = body.shopKey === 'shop2' ? 'shop2' : 'shop1';
  } catch (e) {
    return NextResponse.json({ error: 'Body parse hatasi' }, { status: 400 });
  }

  if (!listingId || !newTitle || newTags.length === 0 || !newDescription) {
    return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
  }

  const steps: string[] = [];

  try {
    const token = await getValidEtsyToken(shopKey);
    const shopId = getEtsyShopId(shopKey);

    const body = new URLSearchParams();
    body.append('title', newTitle);
    body.append('description', newDescription);
    body.append('tags', newTags.slice(0, 13).join(','));

    const res = await fetch(
      ETSY_API + '/shops/' + shopId + '/listings/' + listingId,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error('Etsy update hatasi: ' + JSON.stringify(data).slice(0, 300));
    }

    steps.push('Listing guncellendi: ' + listingId);
    steps.push('Yeni title: ' + newTitle.slice(0, 60));
    steps.push('Yeni ' + newTags.length + ' tag uygulandi');

    const shopUrlSlug = shopKey === 'shop2' ? 'SuzyCardPrints' : 'me';
    return NextResponse.json({
      success: true,
      listingId,
      etsyEditUrl: 'https://www.etsy.com/your/shops/' + shopUrlSlug + '/listing-editor/edit/' + listingId,
      steps,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
