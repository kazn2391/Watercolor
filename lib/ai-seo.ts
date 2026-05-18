interface SeoInput {
  imageDescriptions: string[];
  fileCount: number;
  hasPdf: boolean;
  hasPng: boolean;
  hasJpg: boolean;
}

export interface SeoOutput {
  title: string;
  tags: string[];
  description: string;
  altBase: string;
  primaryColor: string;
  secondaryColor: string;
  artSubject: string;
  occasion: string;
  holiday: string;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function generateEtsySeo(input: SeoInput): Promise<SeoOutput> {
  let fileFormat = 'digital';
  if (input.hasPng && !input.hasJpg) fileFormat = 'PNG';
  else if (input.hasJpg && !input.hasPng) fileFormat = 'JPG';
  else if (input.hasPng && input.hasJpg) fileFormat = 'PNG and JPG';

  const formatRule = fileFormat === 'JPG'
    ? 'The files are JPG. Describe them as high-resolution JPG printable files. Do NOT mention PNG or transparent background. Focus on printable use.'
    : fileFormat === 'PNG'
      ? 'The files are PNG with transparent background. Emphasize transparent PNG, no white box, drops into any project.'
      : 'The files include PNG and JPG. Mention transparent PNG plus printable JPG.';

  const colorList = 'Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow';
  const subjectList = 'Abstract and geometric, Animal, Anime and cartoon, Architecture and cityscape, Beach and tropical, Comics and manga, Fantasy and Sci Fi, Fashion, Flowers, Food and drink, Geography and locale, Horror and gothic, Humorous saying, Inspirational saying, Landscape and scenery, Love and friendship, Military, Music, Nautical, Patriotic and flags, People and portrait, Pet portrait, Phrase and saying, Plants and trees, Religious, Science and tech, Sports and fitness, Stars and celestial, Steampunk, Travel and transportation, Western and cowboy, Zodiac';
  const occasionList = 'none, Birthday, Anniversary, Baby shower, Wedding, Graduation, Engagement, Bridal shower';
  const holidayList = 'none, Christmas, Easter, Halloween, Thanksgiving, Valentines Day, Mothers Day, Fathers Day, New Years, St Patricks Day';

  const rules = [
    'You are a world-class Etsy SEO specialist for 2026. Better than any generic AI.',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string","primaryColor":"string","secondaryColor":"string","artSubject":"string","occasion":"string","holiday":"string"}.',
    'TITLE: Start with the file count number then the specific subject (example: 20 Cat Clipart). Under 15 words. First 50 characters carry the count plus actual subject. Use the pipe character to separate clusters. Reads naturally for Google. No generic opener like Watercolor Clipart Bundle.',
    'TAGS: exactly 13 array items. Each tag 20 characters or fewer. MIX: about half SHORT 1-2 word tags (cat png, cat clipart, watercolor) and half LONG-TAIL (grumpy cat clipart). Always include the word watercolor in at least one tag. No tag repeats a phrase from the title. None empty.',
    'DESCRIPTION: First sentence clearly states what the item is and the file count. ' + formatRule + ' Then paragraphs separated by blank lines. Include a line starting WHAT YOU GET: and a line starting COMMERCIAL USE:. Tell the buyer to purchase, download the file, and start creating (do NOT say ZIP, say download the file). Do NOT mention US buyers or country. Do NOT put AI wording at the top. Only at the very END add a short discreet line: Files made with AI.',
    'altBase: a short 6 to 10 word phrase describing the designs including subject, colors and style.',
    'primaryColor: the single most dominant color of the designs. Choose EXACTLY ONE from this list: ' + colorList + '.',
    'secondaryColor: the second most dominant color. Choose EXACTLY ONE different one from: ' + colorList + '.',
    'artSubject: choose EXACTLY ONE best match from: ' + subjectList + '. For cats dogs animals pick Animal. For flowers pick Flowers.',
    'occasion: choose ONE from: ' + occasionList + '. Use none unless the designs clearly target a specific occasion.',
    'holiday: choose ONE from: ' + holidayList + '. Use none unless the designs are clearly that holiday theme.',
  ].join(' ');

  const userMsg =
    'This bundle has exactly ' + input.fileCount + ' design files in ' + fileFormat + ' format. ' +
    'The designs show: ' + input.imageDescriptions.join(' | ') + '. ' +
    'Base everything on the actual subject and colors of these designs. Return JSON now.';

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

  if (typeof parsed.title !== 'string') parsed.title = '';
  if (parsed.title.length > 140) parsed.title = parsed.title.slice(0, 140);

  if (!Array.isArray(parsed.tags)) parsed.tags = [];
  const cleanTags: string[] = [];
  for (const t of parsed.tags) {
    const tag = String(t).trim();
    if (tag.length > 0 && tag.length <= 20) cleanTags.push(tag);
  }
  const fillers = ['cat clipart', 'watercolor', 'png clipart', 'digital download', 'instant download', 'craft supply'];
  let fi = 0;
  while (cleanTags.length < 13 && fi < fillers.length) {
    if (cleanTags.indexOf(fillers[fi]) === -1) cleanTags.push(fillers[fi]);
    fi++;
  }
  parsed.tags = cleanTags.slice(0, 13);

  if (typeof parsed.description !== 'string') parsed.description = '';
  if (typeof parsed.altBase !== 'string' || parsed.altBase.length === 0) {
    parsed.altBase = 'watercolor clipart design';
  }
  if (typeof parsed.primaryColor !== 'string') parsed.primaryColor = '';
  if (typeof parsed.secondaryColor !== 'string') parsed.secondaryColor = '';
  if (typeof parsed.artSubject !== 'string') parsed.artSubject = '';
  if (typeof parsed.occasion !== 'string') parsed.occasion = 'none';
  if (typeof parsed.holiday !== 'string') parsed.holiday = 'none';

  return parsed;
}
