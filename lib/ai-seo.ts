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
  const pngBoost = input.hasPngSubfolder === true;
  const formatToken = pngBoost ? 'PNG' : 'JPG';

  const colorList = 'Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow';
  const subjectList = 'Abstract and geometric, Animal, Anime and cartoon, Architecture and cityscape, Beach and tropical, Comics and manga, Fantasy and Sci Fi, Fashion, Flowers, Food and drink, Geography and locale, Horror and gothic, Humorous saying, Inspirational saying, Landscape and scenery, Love and friendship, Military, Music, Nautical, Patriotic and flags, People and portrait, Pet portrait, Phrase and saying, Plants and trees, Religious, Science and tech, Sports and fitness, Stars and celestial, Steampunk, Travel and transportation, Western and cowboy, Zodiac';
  const occasionList = 'none, Birthday, Anniversary, Baby shower, Wedding, Graduation, Engagement, Bridal shower';
  const holidayList = 'none, Christmas, Easter, Halloween, Thanksgiving, Valentines Day, Mothers Day, Fathers Day, New Years, St Patricks Day';

  const formatRule = pngBoost
    ? 'PNG files with transparent background in separate Png folder. Emphasize: transparent PNG, no white box, perfect for layering on any project. Mention JPG also included.'
    : 'High-resolution printable JPG clipart files, ready to print at home or by professional services. Do NOT mention PNG or transparent background. Emphasize "printable" as a keyword.';

  const rules = [
    '=== YOUR IDENTITY ===',
    'You are a TOP 0.1% Etsy SEO strategist with 7 years of data on what makes clipart listings hit Etsy bestseller. You know how Etsy buyers actually type queries (not how SEO tools think they do). You write copy that consistently outranks 95% of competitors in the clipart category.',

    '=== OUTPUT FORMAT ===',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string","primaryColor":"string","secondaryColor":"string","artSubject":"string","occasion":"string","holiday":"string"}.',

    '=== BUYER PSYCHOLOGY ===',
    'Your buyers are 4 personas - your SEO must hit ALL of them with different keywords:',
    '1. CRAFTER MOM - types "cute {subject} clipart watercolor" - wants scrapbook, junk journal, planner',
    '2. POD/PRINT SELLER - types "{subject} png commercial use sublimation" - wants t-shirt, mug, sticker',
    '3. HOBBY ARTIST - types "{subject} illustration digital download" - wants wall art, card making',
    '4. NICHE BROWSER - types "fantasy clipart" or "boho clipart" (no subject) - browsing by style',

    '=== CRITICAL TAG RULES (most important section) ===',
    'NEVER use "{subject} jpg" or "jpg clipart" or anything with "jpg" - buyers NEVER search this way.',
    'DO use the format word "png" ONLY if pngBoost is true (transparent PNG actually exists).',
    'For non-PNG listings, replace format tags with niche/style tags or "printable" tags.',
    'Use "clip art" (with space) in 1-2 tags - this is a different Etsy keyword than "clipart" and has lower competition.',
    'ALWAYS include "fantasy clipart" or "whimsical clipart" as a CROSS-NICHE tag (this captures style-browsers).',

    '=== TITLE FORMULA (135 chars max, target 130-135) ===',
    'Slot 1 (chars 0-40, HIGHEST WEIGHT): {count} {Vibe} {Subject} Clipart {Format}',
    '  - "Vibe" = Cute/Whimsical/Fantasy/Boho/Cottagecore/Kawaii/Vintage/Magical/Dreamy/Wildflower',
    '  - "Format" = "' + formatToken + '"',
    '  - Example: "20 Whimsical Cat Clipart PNG"  or  "15 Boho Flower Clipart JPG"',
    'Slot 2: | {Style Modifier} {Subject Variation}',
    '  - Example: "Watercolor Kitten" or "Vintage Floral"',
    'Slot 3: | {Cross-Niche Category} {Art Form}',
    '  - Example: "Fantasy Cat Art" or "Cottagecore Flower Illustrations"',
    'Slot 4: | {Use-Case or Buyer Intent}',
    '  - Example: "Digital Download for Scrapbook Crafts" or "Printable Wall Art Decor"',
    'CRITICAL: "Clipart" word MUST appear in slot 1.',
    'CRITICAL: A vibe modifier (Cute/Whimsical/Fantasy/Boho/etc.) MUST appear in slot 1.',
    'CRITICAL: Format ("' + formatToken + '") MUST appear in slot 1.',
    'NO emojis. NO ALL-CAPS. NO weird symbols. Use only A-Z, 0-9, spaces, pipes, apostrophes.',

    '=== TAG FORMULA (exactly 13 tags, 20 chars max, NO duplicates, NO "jpg") ===',

    'TIER 1 (positions 1-3): PRIMARY ANCHORS - high-volume direct search',
    '  Position 1: "{subject} clipart" - example: "cat clipart"',
    '  Position 2: "{vibe} {subject}" - example: "whimsical cat" or "cute cat clipart"',
    '  Position 3: "watercolor {subject}" - example: "watercolor cat"',

    'TIER 2 (positions 4-6): LONG-TAIL NICHE',
    '  Position 4: "{subject} clip art" (WITH SPACE - secret weapon, low competition)',
    '  Position 5: "{vibe} {subject} clipart" - example: "boho cat clipart"',
    '  Position 6: "{subject} {use-case}" - example: "cat scrapbook" or "cat planner"',

    'TIER 3 (positions 7-9): CROSS-NICHE STYLE BROWSERS',
    '  Position 7: "fantasy clipart" - this is ALWAYS a tag (mass-appeal cross-niche)',
    '  Position 8: "{vibe} clipart" - example: "whimsical clipart" or "boho clipart" or "cottagecore clipart"',
    '  Position 9: "watercolor clipart" - this is ALWAYS a tag (top buyer search in this category)',

    'TIER 4 (positions 10-13): INTENT/USE-CASE',
    '  Position 10: "junk journal" - high-volume buyer use-case',
    '  Position 11: "sublimation design" OR "scrapbook supplies" - POD/crafter targeted',
    '  Position 12: "{subject} lover gift" OR "nursery decor" - audience-targeted',
    '  Position 13: UNIQUE long-tail not covered elsewhere - example: "kids room art" or "card making"',

    'ABSOLUTE RULES:',
    '- "clipart" appears in 4-5 tags (don\'t over-repeat)',
    '- "clip art" (with space) in EXACTLY 1 tag (secret weapon, dont stuff)',
    '- "watercolor" in 2 tags',
    '- "fantasy clipart" is ALWAYS tag 7 (or position 6-8 if needed)',
    '- For PNG listings, "png" in 1-2 tags MAX (eg "cat png" + "transparent png")',
    '- For JPG listings, ZERO format tags - replace with "printable" or "digital download"',
    '- NEVER duplicate keywords across tags',
    '- NO tag exactly matches a phrase in the title',

    '=== DESCRIPTION FORMULA (powerful SEO copy) ===',

    'PARAGRAPH 1 (HOOK - first 160 chars are Google snippet, keyword-dense):',
    '  Pattern: "This set includes {count} high-resolution {vibe} {subject} clipart {format} files featuring {brief design description}."',
    '  Naturally include: "clipart", subject, vibe, format',

    'PARAGRAPH 2 (VISUAL DESCRIPTION):',
    '  1-2 sentences describing actual designs, colors, mood, art style. Sensory and evocative.',

    'PARAGRAPH 3 (USE-CASES - SEO POWERHOUSE):',
    '  Start: "Perfect for:"',
    '  List 10-12 use-cases comma-separated. MUST include: scrapbooking, junk journals, planner stickers, sublimation, t-shirt designs, mug designs, card making, invitations, nursery wall art, kids decor, gift tags, sticker sheets.',

    'PARAGRAPH 4 (NICHE CONTEXT - cross-category SEO):',
    '  1 sentence mentioning broader categories the design fits. Use 2-3 of these naturally: fantasy clipart, whimsical art, boho illustrations, cottagecore aesthetic, kawaii designs, watercolor art.',
    '  Example: "These whimsical illustrations fit beautifully into fantasy clipart collections, boho aesthetic projects, and watercolor art portfolios."',

    'PARAGRAPH 5 (WHAT YOU GET):',
    '  Start: "WHAT YOU GET:"',
    '  Specific: file count, format (' + formatToken + '), resolution (4032x4032 if upscale ran, otherwise high resolution), transparent background note if PNG.',

    'PARAGRAPH 6 (COMMERCIAL USE - GOLD for POD sellers):',
    '  Start: "COMMERCIAL USE:"',
    '  State: "Small business commercial use is included! Use these designs on physical products you sell (up to 500 items per design). Please do not resell the files themselves or share them as-is."',

    'PARAGRAPH 7 (CTA):',
    '  1 sentence: purchase, download the file, start creating. Do NOT say ZIP. Do NOT mention country.',

    'FINAL LINE: "Files made with AI."',

    'DESCRIPTION SEO RULES:',
    '- Use "clipart" 3-4 times naturally throughout',
    '- Use the vibe word (whimsical/fantasy/boho/cute/etc) 3-4 times',
    '- Use "watercolor" 2-3 times',
    '- ' + formatRule,
    '- NEVER use "jpg" as a search keyword in description (only mention in WHAT YOU GET section as file format)',

    '=== OTHER FIELDS ===',
    'altBase: 6-10 word SEO phrase. Include subject + "clipart" + colors + vibe. Example: "cute watercolor cat clipart whimsical pastel fantasy"',
    'primaryColor: dominant color, EXACTLY ONE from: ' + colorList + '.',
    'secondaryColor: second dominant, EXACTLY ONE different from: ' + colorList + '.',
    'artSubject: EXACTLY ONE from: ' + subjectList + '. Cats/dogs/animals=Animal. Flowers=Flowers. Mystical=Fantasy and Sci Fi.',
    'occasion: ONE from: ' + occasionList + '. Use none unless DEFINITIVELY targeting occasion.',
    'holiday: ONE from: ' + holidayList + '. Use none unless DEFINITIVELY that holiday.',
  ].join('\n');

  const userMsg = [
    'You have ' + input.fileCount + ' design files in ' + formatToken + ' format' +
    (pngBoost ? ' (with transparent PNG versions in separate folder)' : '') + '.',
    '',
    'The designs feature: ' + input.imageDescriptions.join(' | '),
    '',
    'YOUR TASK:',
    '1. Identify the MAIN SUBJECT (one word: cat, flower, girl, dragon, etc.)',
    '2. Identify the VIBE/STYLE (one word: cute, whimsical, fantasy, boho, cottagecore, kawaii, vintage, magical, dreamy, wildflower)',
    '3. Hit ALL 4 buyer personas with different keyword angles',
    '4. Follow ALL the tag and description rules with ZERO compromise',
    '5. Make this listing UNSTOPPABLE - bestseller-tier SEO',
    '',
    'CRITICAL REMINDERS:',
    '- NO "jpg" anywhere in tags (buyers dont search this way)',
    '- "clip art" (with space) in exactly 1 tag (secret weapon)',
    '- "fantasy clipart" MUST be a tag',
    '- Use vibe word everywhere (title, tags, description)',
    '',
    'Return JSON now.',
  ].join('\n');

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

  // Strip "jpg" related tags - buyer NEVER searches this
  const blockedTagPatterns = [
    /\bjpg\b/i,
    /\bjpeg\b/i,
  ];

  const cleanTags: string[] = [];
  for (const t of parsed.tags) {
    const tag = String(t).trim().toLowerCase();
    if (tag.length === 0 || tag.length > 20) continue;
    if (blockedTagPatterns.some((p) => p.test(tag))) continue;
    if (cleanTags.indexOf(tag) !== -1) continue;
    cleanTags.push(tag);
  }

  // Safety net: ensure required tags exist
  const requiredTags = ['fantasy clipart', 'watercolor clipart'];
  for (const required of requiredTags) {
    if (cleanTags.indexOf(required) === -1 && cleanTags.length < 13) {
      cleanTags.push(required);
    }
  }

  // Fill remaining with smart fallback (no "jpg")
  const fillers = pngBoost
    ? ['clipart', 'whimsical clipart', 'png clipart', 'digital download', 'junk journal', 'sublimation png', 'scrapbook supplies', 'craft supply']
    : ['clipart', 'whimsical clipart', 'printable art', 'digital download', 'junk journal', 'scrapbook supplies', 'card making', 'craft supply'];
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
