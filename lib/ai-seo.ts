interface SeoInput {
  imageDescriptions: string[];
  fileCount: number;
  hasPdf: boolean;
}

export interface SeoOutput {
  title: string;
  tags: string[];
  description: string;
  altBase: string;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function generateEtsySeo(input: SeoInput): Promise<SeoOutput> {
  const focus = input.hasPdf ? 'sublimation PNG' : 'printable clipart';
  const productType = input.hasPdf
    ? 'sublimation PNG bundle for apparel and product printing (shirts, mugs, tumblers, tote bags)'
    : 'printable watercolor clipart bundle for crafts, junk journals, cards and digital design';

  const sys =
    'You are a world-class Etsy SEO specialist for 2026. Output ONLY valid JSON, no markdown, no preamble. ' +
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string"}.\n' +
    'RULES (follow EXACTLY):\n' +
    'TITLE: under 15 words. Google shows first 50-60 chars, so put the SPECIFIC SUBJECT of the designs + main keyword in the first 50 chars. Must read naturally for a human seeing it on Google. State clearly what the item is at the start. Use | only to separate clusters. No filler words like beautiful/stunning.\n' +
    'TAGS: EXACTLY 13. Each tag MUST be 20 characters or fewer (hard Etsy limit, count every character including spaces). Multi-word long-tail phrases buyers actually search. No tag repeats a phrase already in the title. None empty.\n' +
    'DESCRIPTION: First sentence must clearly state exactly what the item is (a person reading only the first sentence knows what is sold). Then detailed paragraphs. Use real paragraph breaks with \\n\\n between sections. Include a line "WHAT YOU GET:" and a line "COMMERCIAL USE:". Avoid repeating the same phrase. Include exact file count, 300 DPI, transparent PNG, instant download, US focus. Never say "wall art".\n' +
    'altBase: a short 6-10 word descriptive phrase of what the designs actually show, including color and style (used to build image alt text). Example: "watercolor floral cat clipart in soft pastel tones".';

  const usr =
    'Product: ' + productType + '. Focus keyword theme: ' + focus + '. ' +
    'This bundle has EXACTLY ' + input.fileCount + ' design files. ' +
    'The actual designs show: ' + input.imageDescriptions.join(' | ') + '. ' +
    'Base the title, tags and altBase on the ACTUAL subject of these designs, not generic words. Return JSON now.';

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
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
    throw new Error('AI invalid JSON: ' + text.slice(0, 300));
  }

  if (typeof parsed.title !== 'string') parsed.title = '';
  if (parsed.title.length > 140) parsed.title = parsed.title.slice(0, 140);

  if (!Array.isArray(parsed.tags)) parsed.tags = [];
  parsed.tags = parsed.tags
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0 && t.length <= 20);
  const fillers = ['digital download', 'instant download', 'png clipart', 'commercial use', 'craft supply', 'printable art'];
  let fi = 0;
  while (parsed.tags.length < 13 && fi < fillers.length) {
    if (parsed.tags.indexOf(fillers[fi]) === -1) parsed.tags.push(fillers[fi]);
    fi++;
  }
  parsed.tags = parsed.tags.slice(0, 13);

  if (typeof parsed.description !== 'string') parsed.description = '';
  if (typeof parsed.altBase !== 'string' || !parsed.altBase) {
    parsed.altBase = 'watercolor clipart design';
  }

  return parsed;
}
