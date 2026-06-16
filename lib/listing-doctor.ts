import { ListingDetails, ListingStats } from './etsy-fetch';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export type DiagnosisCategory = 'A_HIGH_VIEWS_LOW_SALES' | 'B_DEAD_SEO' | 'C_SEASONAL_MISS' | 'D_COOLED_BESTSELLER';

export interface Diagnosis {
  category: DiagnosisCategory;
  categoryLabel: string;
  diagnosis: string;
  recommendation: string;
  isBestsellerWarning: boolean;
  newTitle: string;
  newTags: string[];
  newDescription: string;
}

const AI_DISCLOSURE_NOTE = [
  '',
  '─────────────────────────',
  '🎨 AI-ASSISTED DESIGN DISCLOSURE',
  'These artworks were created with the assistance of Artificial Intelligence (AI) generation tools. As the designer, I direct the creative process: I choose the concepts, style direction, color palettes, and curate the final selections. Each design is reviewed, refined, and prepared by me for commercial-quality download. Designed by seller using AI generators.',
  '─────────────────────────',
].join('\n');

const BONUS_GIFT_NOTE = [
  '',
  '─────────────────────────',
  '🎁 SPECIAL BONUS GIFT',
  'As a thank you for supporting our small studio, every order includes a FREE bonus pack of 100+ additional designs - automatically delivered with your bundle. A little something from our hearts to yours 🤍',
  '─────────────────────────',
].join('\n');

/**
 * Listing'i analiz eder, kategorize eder
 */
export function diagnoseCategory(
  details: ListingDetails,
  stats: ListingStats,
  estimatedSales: number
): { category: DiagnosisCategory; categoryLabel: string; diagnosis: string; isBestsellerWarning: boolean } {
  const isBestsellerWarning = estimatedSales >= 20 || details.numFavorers >= 100;

  const titleLower = details.title.toLowerCase();
  const seasonalKeywords = ['christmas', 'halloween', 'easter', 'valentine', 'thanksgiving', 'mothers day', 'fathers day', 'st patricks'];
  const isSeasonalListing = seasonalKeywords.some((k) => titleLower.includes(k));

  if (stats.viewsPerDay < 1 && details.views < 100) {
    return {
      category: 'B_DEAD_SEO',
      categoryLabel: 'B - SEO Olu',
      diagnosis: 'Sadece ' + details.views + ' lifetime view, ' + Math.round(stats.viewsPerDay * 10) / 10 + ' view/gun. Etsy bu listingi bulamiyor. Title ve taglar yeniden yazilmali.',
      isBestsellerWarning,
    };
  }

  if (stats.conversionRate < 1 && details.views > 500) {
    return {
      category: 'A_HIGH_VIEWS_LOW_SALES',
      categoryLabel: 'A - Yuksek View Dusuk Sale',
      diagnosis: details.views + ' view ama dusuk satis. SEO trafik getiriyor ama listing tiklananlari donusturmuyor. Description ve hook guclendir, title az dokun.',
      isBestsellerWarning,
    };
  }

  if (isSeasonalListing) {
    return {
      category: 'C_SEASONAL_MISS',
      categoryLabel: 'C - Sezonsal',
      diagnosis: 'Sezonsal tema tespit edildi. Yaklasan sezon icin optimize et veya sezon-bagimsiz keywordler ekle.',
      isBestsellerWarning,
    };
  }

  if (estimatedSales > 5 && stats.viewsPerDay < 2) {
    return {
      category: 'D_COOLED_BESTSELLER',
      categoryLabel: 'D - Sogumus Bestseller',
      diagnosis: 'Bir zamanlar satiyor olmali (' + estimatedSales + ' tahmini satis) ama sogumus. Minor tweaks + fresh keyword ekle.',
      isBestsellerWarning,
    };
  }

  return {
    category: 'B_DEAD_SEO',
    categoryLabel: 'B - SEO Olu',
    diagnosis: 'Performans dusuk. Kapsamli SEO yenilemesi gerekli.',
    isBestsellerWarning,
  };
}

/**
 * AI ile yeni SEO uretir
 */
export async function generateOptimizedSeo(
  details: ListingDetails,
  diagnosisInfo: { category: DiagnosisCategory; categoryLabel: string; diagnosis: string; isBestsellerWarning: boolean }
): Promise<{ newTitle: string; newTags: string[]; newDescription: string; recommendation: string }> {
  const categoryGuidance: Record<DiagnosisCategory, string> = {
    A_HIGH_VIEWS_LOW_SALES:
      'KATEGORI A: Title az dokun (trafik aliyor), description komple yeniden yaz - hook gucu artir, urun ozelliklerini netlestir, bonus image, video, AI disclosure vurgusu yap. Tag-larin 3-4unu yenile, 9-10unu koru.',
    B_DEAD_SEO:
      'KATEGORI B: Title komple yeniden yaz - rakam ile basla, vibe word + subject + clipart + format. 13 taglarin hepsini yeniden uret. Description SEO-rich versiyon: hook, use-cases, what-you-get, commercial use, CTA.',
    C_SEASONAL_MISS:
      'KATEGORI C: Sezonsal listing. Title sezon-bagimsiz keywordleri one cikar (year-round usable). Tag-larin yarisi sezonsal, digerleri evergreen (junk journal, scrapbook, etc). Description yil boyu kullanilabilirligi vurgular.',
    D_COOLED_BESTSELLER:
      'KATEGORI D: Eski bestseller, dokunma minor olsun. Title-da 1-2 fresh keyword ekle, ana yapiyi koru. Tag-larin 3unu yenile, 10unu birak. Description sadece hook ve CTA guncelle.',
  };

  const rules = [
    '=== ROLE ===',
    'You are an expert Etsy SEO doctor for SuzyFlowArt - a watercolor whimsical clipart shop on Etsy.',
    'You optimize underperforming listings without breaking what works.',
    '',
    '=== INPUT ===',
    'Current title: "' + details.title + '"',
    'Current tags: ' + JSON.stringify(details.tags),
    'Current description (first 300 chars): "' + details.description.slice(0, 300) + '"',
    'Diagnosis: ' + diagnosisInfo.diagnosis,
    'Strategy: ' + categoryGuidance[diagnosisInfo.category],
    diagnosisInfo.isBestsellerWarning ? '⚠️ BESTSELLER WARNING: This listing has good history. Be CONSERVATIVE with changes. Preserve what works.' : '',
    '',
    '=== OUTPUT FORMAT ===',
    'Output ONLY valid JSON with this schema:',
    '{"newTitle":"string","newTags":["13 strings"],"newDescription":"string","recommendation":"1-2 sentence summary of what you changed and why"}',
    '',
    '=== TITLE RULES (HARD) ===',
    '- MAX 13 words',
    '- Start with number (item count if applicable, e.g. 30)',
    '- Must contain "Clipart"',
    '- Must contain "Watercolor"',
    '- Must contain a vibe word: Whimsical, Cute, Boho, Cottagecore, Magical, Dreamy, Fantasy (default Whimsical)',
    '- 3 slots separated by | (pipe)',
    '- Example: "30 Whimsical Cat Clipart PNG | Watercolor Kitten Design | Scrapbook Crafts"',
    '- BIRTHDAY: must contain "Happy Birthday Clipart" exact phrase',
    '- CHRISTMAS/HALLOWEEN/EASTER/WEDDING/VALENTINE: include "{Holiday} Clipart" + "Watercolor"',
    '',
    '=== TAGS RULES (HARD) ===',
    '- Exactly 13 tags',
    '- Each tag max 20 chars',
    '- No duplicates',
    '- No "jpg" or "jpeg" anywhere',
    '- Include "clip art" (with space) in exactly 1 tag (low competition keyword)',
    '- Include "fantasy clipart" (mandatory cross-niche)',
    '- Include "watercolor clipart" (mandatory)',
    '- Tier strategy: 3 primary anchors, 3 long-tail, 3 cross-niche, 4 use-case',
    '',
    '=== DESCRIPTION RULES ===',
    '- Paragraph 1: HOOK (first 160 chars = Google snippet, keyword-dense)',
    '- Paragraph 2: Visual description, sensory',
    '- Paragraph 3: "Perfect for:" + 10-12 use-cases (scrapbooking, junk journals, sublimation, t-shirt, mug, card making, etc)',
    '- Paragraph 4: Niche context (cross-category SEO)',
    '- Paragraph 5: "WHAT YOU GET:" specifics (file count, format, resolution)',
    '- Paragraph 6: "COMMERCIAL USE:" small business OK up to 500 items per design',
    '- Paragraph 7: CTA (purchase, download, create)',
    '- Do NOT add AI disclosure or bonus gift note - system adds them automatically',
    '- Use "watercolor" 2-3 times, "clipart" 3-4 times, vibe word 3-4 times',
    '',
    'Return JSON now.',
  ].filter((l) => l.length > 0).join('\n');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: rules }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('AI Doctor failed: ' + JSON.stringify(data).slice(0, 300));
  }

  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
  }
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: { newTitle: string; newTags: string[]; newDescription: string; recommendation: string };
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('AI Doctor invalid JSON: ' + text.slice(0, 300));
  }

  // Title hard validation
  if (parsed.newTitle.length > 130) {
    parsed.newTitle = parsed.newTitle.slice(0, 130).trim();
  }
  const titleWords = parsed.newTitle.split(/\s+/).filter((w) => w.length > 0 && w !== '|');
  if (titleWords.length > 13) {
    const tokens = parsed.newTitle.split(/\s+/);
    const kept: string[] = [];
    let wordCount = 0;
    for (const t of tokens) {
      if (t === '|') {
        if (kept.length > 0 && kept[kept.length - 1] !== '|') kept.push(t);
        continue;
      }
      if (wordCount >= 13) break;
      kept.push(t);
      wordCount++;
    }
    while (kept.length > 0 && kept[kept.length - 1] === '|') kept.pop();
    parsed.newTitle = kept.join(' ').trim();
  }

  // Tag validation
  if (!Array.isArray(parsed.newTags)) parsed.newTags = [];
  const cleanTags: string[] = [];
  for (const t of parsed.newTags) {
    const tag = String(t).trim().toLowerCase();
    if (tag.length === 0 || tag.length > 20) continue;
    if (/\bjpg\b/i.test(tag) || /\bjpeg\b/i.test(tag)) continue;
    if (cleanTags.indexOf(tag) !== -1) continue;
    cleanTags.push(tag);
  }
  parsed.newTags = cleanTags.slice(0, 13);

  // Append AI disclosure + bonus gift
  parsed.newDescription = parsed.newDescription.trimEnd() + '\n' + AI_DISCLOSURE_NOTE;
  parsed.newDescription = parsed.newDescription.trimEnd() + '\n' + BONUS_GIFT_NOTE;

  return parsed;
}
