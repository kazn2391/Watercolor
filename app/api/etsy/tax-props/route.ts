import { NextResponse } from 'next/server';
import { getValidEtsyToken, getEtsyApiKeyHeader } from '@/lib/etsy-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ETSY_API = 'https://api.etsy.com/v3/application';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (!process.env.CRON_SECRET || adminKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getValidEtsyToken();
    const taxId = url.searchParams.get('tax') || '6844';

    const res = await fetch(
      ETSY_API + '/seller-taxonomy/nodes/' + taxId + '/properties',
      {
        headers: {
          Authorization: 'Bearer ' + token,
          'x-api-key': getEtsyApiKeyHeader(),
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Etsy hata', status: res.status, detail: data },
        { status: 500 }
      );
    }

    // Sadece ihtiyacimiz olan ozeti dondur (kisa, okunur)
    const summary = (data.results || []).map((p: any) => ({
      property_id: p.property_id,
      name: p.name,
      required: p.is_required,
      supports_attributes: p.supports_attributes,
      scales: p.scales ? p.scales.length : 0,
      possible_values: (p.possible_values || []).map((v: any) => ({
        value_id: v.value_id,
        name: v.name,
      })),
    }));

    return NextResponse.json({ taxonomy_id: taxId, count: summary.length, properties: summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
