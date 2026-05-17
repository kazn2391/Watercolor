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
  const productType = input.hasPdf
    ? 'sublimation PNG bundle for apparel and product printing'
    : 'printable watercolor clipart bundle for crafts and digital design';

  const rules = [
    'You are a world-class Etsy SEO specialist for 2026.',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string"}.',
    'TITLE: under 15 words. The first 50 characters MUST name the actual specific subject of the designs (if cats, start with Cat Clipart; if teacher themed, start with Teacher Sublimation; if floral, start with Floral Clipart). Do NOT start with generic words like Watercolor Clipart Bundle. Use the pipe character to separate clusters. Reads naturally for Google.',
    'TAGS: exactly 13 array items. Each tag 20 characters or fewer. Multi-word long-tail phrases buyers search. No tag repeats a phrase from the title. None empty.',
    'DESCRIPTION: first sentence clearly states exactly what the item is. Then detailed paragraphs separated by blank lines. Include a WHAT YOU GET line and a COMMERCIAL USE line. Include exact file count, 300 DPI, transparent PNG, instant download, US focus. Never say wall art.',
    'altBase: a short 6 to 10 word phrase describing what the designs actually show including color and style.',
    'CRITICAL: this art is created with AI. NEVER write hand painted, hand drawn, hand illustrated, hand-crafted or handmade. You may say AI-generated or digitally created or just describe the style.',
  ].join(' ');

  const userMsg =
    'Product: ' + productType + '. ' +
    'This bundle has exactly ' + input.fileCount + ' design files. ' +
    'The designs show: ' + input.imageDescriptions.join(' | ') + '. ' +
    'Base the title first words, tags and altBase on the actual subject of these designs. Return JSON now.';

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
      system: rules,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('AI SEO failed: ' + JSON.stringify(data).slice(0, 300));
  }

  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: SeoOutput;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('AI invalid JSON: ' + text.slice(0, 300));
  }

  if (typeof parsed.title !== 'string') {
    parsed.title = '';
  }
  if (parsed.title.length > 140) {
    parsed.title = parsed.title.slice(0, 140);
  }

  if (!Array.isArray(parsed.tags)) {
    parsed.tags = [];
  }
  const cleanTags: string[] = [];
  for (const t of parsed.tags) {
    const tag = String(t).trim();
    if (tag.length > 0 && tag.length <= 20) {
      cleanTags.push(tag);
    }
  }
  const fillers = ['digital download', 'instant download', 'png clipart', 'commercial use', 'craft supply', 'printable art'];
  let fi = 0;
  while (cleanTags.length < 13 && fi < fillers.length) {
    if (cleanTags.indexOf(fillers[fi]) === -1) {
      cleanTags.push(fillers[fi]);
    }
    fi++;
  }
  parsed.tags = cleanTags.slice(0, 13);

  if (typeof parsed.description !== 'string') {
    parsed.description = '';
  }
  if (typeof parsed.altBase !== 'string' || parsed.altBase.length === 0) {
    parsed.altBase = 'watercolor clipart design';
  }

  return parsed;
}
