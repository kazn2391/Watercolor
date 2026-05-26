interface SeoInput {
  imageDescriptions: string[];
  fileCount: number;
  hasPdf: boolean;
  hasPng: boolean;
  hasJpg: boolean;
  hasPngSubfolder?: boolean;
  folderNumber?: string;
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

function buildWholeShopNote(folderNumber: string): string {
  return [
    '',
    '─────────────────────────',
    '🛍️ WHOLE SHOP BUNDLE OWNERS',
    'Already own our Whole Shop Bundle? Just search "' + folderNumber + '" in your Google Drive folder to find this exact set in seconds.',
    '─────────────────────────',
  ].join('\n');
}

export async function generateEtsySeo(input: SeoInput): Promise<SeoOutput> {
  let fileFormat = 'digital';
  if (input.hasPng && !input.hasJpg) fileFormat = 'PNG';
  else if (input.hasJpg && !input.hasPng) fileFormat = 'JPG';
  else if (input.hasPng && input.hasJpg) fileFormat = 'PNG and JPG';

  const pngBoost = input.hasPngSubfolder === true;

  let formatRule: string;

  if (pngBoost) {
    if (fileFormat === 'JPG') {
      formatRule = 'The listing images are JPG but this bundle ALSO includes PNG versions with transparent background. Strongly emphasize: transparent PNG included, perfect for layering, no white background, overlay on any project. Mention both JPG for printing and PNG for transparent layering. Put PNG clipart and transparent background in the title and tags.';
    } else {
      formatRule = 'The files include PNG with transparent background. Strongly emphasize: transparent PNG, no white box, perfect for layering and overlaying on any background. Highlight transparent background as a key selling point in title, tags and description. Put PNG clipart and transparent in the title.';
    }
  } else if (fileFormat === 'JPG') {
    formatRule = 'The files are JPG. Describe them as high-resolution JPG printable files. Do NOT mention PNG or transparent background. Focus on printable use.';
  } else if (fileFormat === 'PNG') {
    formatRule = 'The files are PNG with transparent background. Emphasize transparent PNG, no white box, drops into any project.';
  } else {
    formatRule = 'The files include PNG and JPG. Mention transparent PNG plus printable JPG.';
  }

  const colorList = 'Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow';
  const subjectList = 'Abstract and geometric, Animal, Anime and cartoon, Architecture and cityscape, Beach and tropical, Comics and manga, Fantasy and Sci Fi, Fashion, Flowers, Food and drink, Geography and locale, Horror and gothic, Humorous saying, Inspirational saying, Landscape and scenery, Love and friendship, Military, Music, Nautical, Patriotic and flags, People and portrait, Pet portrait, Phrase and saying, Plants and trees, Religious, Science and tech, Sports and fitness, Stars and celestial, Steampunk, Travel and transportation, Western and cowboy, Zodiac';
  const occasionList = 'none, Birthday, Anniversary, Baby shower, Wedding, Graduation, Engagement, Bridal shower';
  const holidayList = 'none, Christmas, Easter, Halloween, Thanksgiving, Valentines Day, Mothers Day, Fathers Day, New Years, St Patricks Day';

  const pngTagRule = pngBoost
    ? 'Because this bundle includes transparent PNG files, make sure at least 2 tags mention PNG (like "png clipart", "transparent png"). Include "transparent" in at least one tag.'
    : '';

  const rules = [
    'You are a world-class Etsy SEO specialist for 2026. Better than any generic AI.',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string","primaryColor":"string","secondaryColor":"string","artSubject":"string","occasion":"string","holiday":"string"}.',
    'TITLE: Start with the file count number then the specific subject (example: 20 Cat Clipart). Under 15 words. First 50 characters carry the count plus actual subject. Use the pipe character to separate clusters. Reads naturally for Google. No generic opener like Watercolor Clipart Bundle.',
    'TAGS: exactly 13 array items. Each tag 20 characters or fewer. MIX: about half SHORT 1-2 word tags (cat png, cat clipart, watercolor) and half LONG-TAIL (grumpy cat clipart). Always include the word watercolor in at least one tag. No tag repeats a phrase from the title. None empty. ' + pngTagRule,
    'DESCRIPTION: First sentence clearly states what the item is and the file count. ' + formatRule + ' Then paragraphs separated by blank lines. Include a line starting WHAT YOU GET: and a line starting COMMERCIAL USE:. Tell the buyer to purchase, download the file, and start creating (do NOT say ZIP, say download the file). Do NOT mention US buyers or country. Do NOT put AI wording at the top. Only at the very END add a short discreet line: Files made with AI.',
    'altBase: a short 6 to 10 word phrase describing the designs including subject, colors and style.',
    'primaryColor: the single most dominant color of the designs. Choose EXACTLY ONE from this list: ' + colorList + '.',
    'secondaryColor: the second most dominant color. Choose EXACTLY ONE different one from: ' + colorList + '.',
    'artSubject: choose EXACTLY ONE best match from: ' + subjectList + '. For cats dogs animals pick Animal. For flowers pick Flowers.',
    'occasion: choose ONE from: ' + occasionList + '. Use none unless the designs clearly target a specific occasion.',
    'holiday: choose ONE from: ' + holidayList + '. Use none unless the designs are clearly that holiday theme.',
  ].join(' ');

  const pngNote = pngBoost ? ' This bundle also includes PNG versions with transparent background in a separate folder.' : '';

  const userMsg =
    'This bundle has exactly ' + input.fileCount + ' design files in ' + fileFormat + ' format.' + pngNote + ' ' +
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
  const fillers = pngBoost
    ? ['png clipart', 'transparent png', 'watercolor', 'digital download', 'instant download', 'craft supply']
    : ['cat clipart', 'watercolor', 'png clipart', 'digital download', 'instant download', 'craft supply'];
  let fi = 0;
  while (cleanTags.length < 13 && fi < fillers.length) {
    if (cleanTags.indexOf(fillers[fi]) === -1) cleanTags.push(fillers[fi]);
    fi++;
  }
  parsed.tags = cleanTags.slice(0, 13);

  if (typeof parsed.description !== 'string') parsed.description = '';

  if (input.folderNumber && input.folderNumber.length > 0) {
    parsed.description = parsed.description.trimEnd() + '\n\n' + buildWholeShopNote(input.folderNumber);
  }

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
