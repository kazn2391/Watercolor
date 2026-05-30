// lib/ai-seo.ts
// AI ile Etsy 2026 SEO uretir. PDF varsa sublimation, line art secilirse line art, yoksa printable clipart.

interface SeoInput {
  imageDescriptions: string[]; // AI'in gordugu gorsel icerikleri
  fileCount: number;           // klasordeki gorsel sayisi
  hasPdf: boolean;             // klasorde PDF var mi (sublimation sinyali)
  productType?: 'auto' | 'line_art'; // opsiyonel: 'line_art' line art clipart icin, yoksa otomatik
}

export interface SeoOutput {
  title: string;
  tags: string[];      // tam 13
  description: string;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function generateEtsySeo(input: SeoInput): Promise<SeoOutput> {
  const isLineArt = input.productType === 'line_art';

  let focus: string;
  let productType: string;
  let extraRules: string;

  if (isLineArt) {
    focus = 'line art clipart';
    productType = 'whimsical line art ink illustration clipart bundle for tattoo, junk journal, sticker, planner and craft projects';
    extraRules =
      'LINE ART SPECIFIC RULES: ' +
      'Use line art / ink / sketch / hand drawn / tattoo flash / whimsical / minimalist keywords. ' +
      'Target audiences: tattoo artists, junk journalers, scrapbookers, planner addicts, sticker makers, card makers. ' +
      'NEVER use "watercolor" (this is line art, not watercolor). ' +
      'NEVER use "wall art" or "sublimation" (wrong audience for line art). ' +
      'Prefer phrases like: line art clipart, ink illustration, tattoo design, junk journal kit, hand drawn art, minimalist clipart, fineline tattoo. ';
  } else if (input.hasPdf) {
    focus = 'sublimation';
    productType = 'sublimation PNG bundle for apparel and product printing';
    extraRules = '';
  } else {
    focus = 'printable clipart';
    productType = 'printable watercolor clipart bundle for crafts and digital design';
    extraRules = '';
  }

  const sys =
    'You are an expert Etsy SEO specialist following the 2026 Etsy search algorithm rules. ' +
    'Rules you MUST follow strictly: ' +
    '1) TITLE: max 140 chars. First 40 chars must contain the primary keyword (only first 40 show in search). ' +
    'Use pipe | to separate distinct keyword clusters. Natural readable phrases, NO keyword stuffing, ' +
    'NO filler words (beautiful, amazing, stunning). Front-load the product noun. ' +
    '2) TAGS: EXACTLY 13 tags. Each max 20 chars. Multi-word long-tail phrases. ' +
    'NO tag may repeat a phrase already in the title. No single words if a phrase fits. ' +
    'No trademarked brand names. Cover different search variations. ' +
    '3) DESCRIPTION: First 160 chars must be a keyword-rich mini-title (Etsy uses it as ranking signal). ' +
    'Then conversion copy. Include exact file count, format, 300 DPI, transparent, commercial use, instant download. ' +
    'US market focus. NEVER use "wall art" (not our audience). ' +
    extraRules +
    'Return ONLY valid JSON: {"title":"...","tags":["..13 items.."],"description":"..."}. No markdown, no preamble.';

  const usr =
    'Create Etsy SEO for a ' + productType + '. ' +
    'Focus: ' + focus + '. ' +
    'This bundle contains ' + input.fileCount + ' design files. ' +
    'The designs show: ' + input.imageDescriptions.join('; ') + '. ' +
    'Generate the title, exactly 13 tags, and description as JSON.';

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error('AI SEO failed: ' + JSON.stringify(data).slice(0, 300));

  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
  }
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: SeoOutput;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('AI returned invalid JSON: ' + text.slice(0, 300));
  }

  // Guvenlik: kurallari zorla uygula
  if (parsed.title.length > 140) parsed.title = parsed.title.slice(0, 140);
  if (!Array.isArray(parsed.tags)) parsed.tags = [];
  parsed.tags = parsed.tags
    .map((t) => String(t).slice(0, 20).trim())
    .filter((t) => t.length > 0)
    .slice(0, 13);
  while (parsed.tags.length < 13) {
    parsed.tags.push('digital download');
  }

  return parsed;
}
