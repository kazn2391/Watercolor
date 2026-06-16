import { NextResponse } from 'next/server';
import { extractListingId, fetchListingDetails, calculateStats } from '@/lib/etsy-fetch';
import { diagnoseCategory, generateOptimizedSeo } from '@/lib/listing-doctor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ADMIN_PASSWORD = 'Kuzey2391';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get('key');
  if (adminKey !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let listingUrl = '';
  let shopKey: string = 'shop1';
  let estimatedSales: number = 0;

  try {
    const body = await req.json();
    listingUrl = body.listingUrl || '';
    shopKey = body.shopKey === 'shop2' ? 'shop2' : 'shop1';
    estimatedSales = parseInt(body.estimatedSales) || 0;
  } catch (e) {
    return NextResponse.json({ error: 'listingUrl gerekli' }, { status: 400 });
  }

  if (!listingUrl) {
    return NextResponse.json({ error: 'listingUrl bos' }, { status: 400 });
  }

  const listingId = extractListingId(listingUrl);
  if (!listingId) {
    return NextResponse.json({ error: 'URL den listing ID cikarilamadi' }, { status: 400 });
  }

  const steps: string[] = [];

  try {
    steps.push('Listing ID: ' + listingId);
    steps.push('Shop: ' + (shopKey === 'shop2' ? 'SuzyCardPrints' : 'SuzyFlowArt'));

    const details = await fetchListingDetails(listingId, shopKey);
    steps.push('Listing detaylari cekildi: "' + details.title.slice(0, 60) + '..."');
    steps.push('Lifetime: ' + details.views + ' view, ' + details.numFavorers + ' fav');

    const stats = calculateStats(details, estimatedSales);
    steps.push('Yas: ' + stats.ageInDays + ' gun, ' + Math.round(stats.viewsPerDay * 10) / 10 + ' view/gun');

    const diagnosisInfo = diagnoseCategory(details, stats, estimatedSales);
    steps.push('Tani: ' + diagnosisInfo.categoryLabel);

    if (diagnosisInfo.isBestsellerWarning) {
      steps.push('⚠️ BESTSELLER UYARI: Bu listing iyi performans gosteriyor, dikkatli ol');
    }

    const optimized = await generateOptimizedSeo(details, diagnosisInfo);
    steps.push('Yeni SEO uretildi');

    return NextResponse.json({
      success: true,
      listingId,
      current: {
        title: details.title,
        tags: details.tags,
        description: details.description,
        views: details.views,
        favorites: details.numFavorers,
      },
      stats,
      diagnosis: {
        category: diagnosisInfo.category,
        categoryLabel: diagnosisInfo.categoryLabel,
        diagnosis: diagnosisInfo.diagnosis,
        isBestsellerWarning: diagnosisInfo.isBestsellerWarning,
      },
      optimized: {
        newTitle: optimized.newTitle,
        newTags: optimized.newTags,
        newDescription: optimized.newDescription,
        recommendation: optimized.recommendation,
      },
      steps,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, steps }, { status: 500 });
  }
}
