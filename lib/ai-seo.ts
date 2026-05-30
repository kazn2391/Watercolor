interface SeoInput {
  imageDescriptions: string[];
  fileCount: number;
  hasPdf: boolean;
  hasPng: boolean;
  hasJpg: boolean;
  hasPngSubfolder?: boolean;
  folderNumber?: string;
  productType?: 'auto' | 'line_art';
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
  const isLineArt = input.productType === 'line_art';

  const colorList = 'Beige, Black, Blue, Bronze, Brown, Clear, Copper, Gold, Gray, Green, Orange, Pink, Purple, Rainbow, Red, Rose gold, Silver, White, Yellow';
  const subjectList = 'Abstract and geometric, Animal, Anime and cartoon, Architecture and cityscape, Beach and tropical, Comics and manga, Fantasy and Sci Fi, Fashion, Flowers, Food and drink, Geography and locale, Horror and gothic, Humorous saying, Inspirational saying, Landscape and scenery, Love and friendship, Military, Music, Nautical, Patriotic and flags, People and portrait, Pet portrait, Phrase and saying, Plants and trees, Religious, Science and tech, Sports and fitness, Stars and celestial, Steampunk, Travel and transportation, Western and cowboy, Zodiac';
  const occasionList = 'none, Birthday, Anniversary, Baby shower, Wedding, Graduation, Engagement, Bridal shower';
  const holidayList = 'none, Christmas, Easter, Halloween, Thanksgiving, Valentines Day, Mothers Day, Fathers Day, New Years, St Patricks Day';

  const formatRule = pngBoost
    ? 'PNG files with transparent background in separate Png folder. Emphasize: transparent PNG, no white box, perfect for layering on any project. Mention JPG also included.'
    : 'High-resolution printable JPG clipart files, ready to print at home or by professional services. Do NOT mention PNG or transparent background. Emphasize "printable" as a keyword.';

  // ============================================================
  // LINE ART MODE - mevcut rules'i bozmadan vibe/tag/use-case adapte eder
  // ============================================================
  const lineArtVibeOverride = isLineArt
    ? 'CRITICAL LINE ART MODE OVERRIDE: This is a LINE ART / ink illustration bundle, NOT watercolor. ' +
      'Use vibe words from: Whimsical, Minimalist, Sketchy, Hand-Drawn, Fine Line, Boho, Mystical, Cute, Delicate, Tattoo Flash. ' +
      'NEVER use "watercolor" anywhere (wrong product). ' +
      'Tag replacements: replace "watercolor {subject}" with "line art {subject}", replace "watercolor clipart" with "line art clipart". ' +
      'Replace "scrapbooking, sublimation" focus with "tattoo design, junk journal, planner stickers, sticker sheets, card making". ' +
      'Target audience shift: from "Crafter Mom + POD Seller" to "Tattoo artists + Junk journalers + Sticker makers + Planner addicts + Card makers". ' +
      'In description, mention: tattoo flash, fine line tattoo, minimalist tattoo, ink illustration, hand drawn line art. ' +
      'REQUIRED TAGS (always include): "line art clipart", "tattoo design", "fineline tattoo", "ink illustration". ' +
      'REMOVE FROM REQUIRED: "watercolor clipart" (this is line art, not watercolor). ' +
      'In description WHAT YOU GET section, mention "hand drawn line art" and "ink illustration" instead of "watercolor". '
    : '';

  const rules = [
    '=== YOUR IDENTITY ===',
    'You are a TOP 0.1% Etsy SEO strategist with 7 years of data on what makes clipart listings hit Etsy bestseller. You know how Etsy buyers actually type queries (not how SEO tools think they do). You write copy that consistently outranks 95% of competitors in the clipart category.',

    '=== OUTPUT FORMAT ===',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string","primaryColor":"string","secondaryColor":"string","artSubject":"string","occasion":"string","holiday":"string"}.',

    '=== BUYER PSYCHOLOGY ===',
    isLineArt
      ? 'Your buyers for LINE ART are 4 different personas - your SEO must hit ALL of them:'
      : 'Your buyers are 4 personas - your SEO must hit ALL of them with different keywords:',
    isLineArt ? '1. TATTOO ARTIST - types "{subject} fine line tattoo" or "{subject} tattoo flash" - wants ready-to-tattoo designs' : '1. CRAFTER MOM - types "cute {subject} clipart watercolor" - wants scrapbook, junk journal, planner',
    isLineArt ? '2. JUNK JOURNALER - types "{subject} line art junk journal" or "ink illustration ephemera" - wants printable art' : '2. POD/PRINT SELLER - types "{subject} png commercial use sublimation" - wants t-shirt, mug, sticker',
    isLineArt ? '3. PLANNER/STICKER MAKER - types "{subject} line art sticker" or "minimalist {subject}" - wants planner content' : '3. HOBBY ARTIST - types "{subject} illustration digital download" - wants wall art, card making',
    isLineArt ? '4. NICHE BROWSER - types "minimalist clipart" or "line art clipart" (no subject) - browsing by style' : '4. NICHE BROWSER - types "fantasy clipart" or "boho clipart" (no subject) - browsing by style',

    '=== CRITICAL TAG RULES (most important section) ===',
    'NEVER use "{subject} jpg" or "jpg clipart" or anything with "jpg" - buyers NEVER search this way.',
    'DO use the format word "png" ONLY if pngBoost is true (transparent PNG actually exists).',
    'For non-PNG listings, replace format tags with niche/style tags or "printable" tags.',
    'Use "clip art" (with space) in 1-2 tags - this is a different Etsy keyword than "clipart" and has lower competition.',
    isLineArt
      ? 'ALWAYS include "line art clipart" as primary tag (this is the core search term for this product).'
      : 'ALWAYS include "fantasy clipart" or "whimsical clipart" as a CROSS-NICHE tag (this captures style-browsers).',

    '=== TITLE FORMULA (135 chars max, target 130-135) ===',
    'Slot 1 (chars 0-40, HIGHEST WEIGHT): {count} {Vibe} {Subject} Clipart {Format}',
    isLineArt
      ? '  - "Vibe" = Whimsical/Minimalist/Sketchy/Hand-Drawn/Fine Line/Boho/Mystical/Cute/Delicate'
      : '  - "Vibe" = Cute/Whimsical/Fantasy/Boho/Cottagecore/Kawaii/Vintage/Magical/Dreamy/Wildflower',
    '  - "Format" = "' + formatToken + '"',
    isLineArt
      ? '  - Example: "20 Whimsical Cat Line Art Clipart PNG"  or  "15 Minimalist Flower Line Clipart JPG"'
      : '  - Example: "20 Whimsical Cat Clipart PNG"  or  "15 Boho Flower Clipart JPG"',
    'Slot 2: | {Style Modifier} {Subject Variation}',
    isLineArt
      ? '  - Example: "Ink Sketch Kitten" or "Fine Line Floral"'
      : '  - Example: "Watercolor Kitten" or "Vintage Floral"',
    'Slot 3: | {Cross-Niche Category} {Art Form}',
    isLineArt
      ? '  - Example: "Tattoo Flash Cat Design" or "Boho Line Art Flower"'
      : '  - Example: "Fantasy Cat Art" or "Cottagecore Flower Illustrations"',
    'Slot 4: | {Use-Case or Buyer Intent}',
    isLineArt
      ? '  - Example: "Junk Journal Planner Sticker" or "Hand Drawn Tattoo Design"'
      : '  - Example: "Digital Download for Scrapbook Crafts" or "Printable Wall Art Decor"',
    'CRITICAL: "Clipart" word MUST appear in slot 1.',
    'CRITICAL: A vibe modifier MUST appear in slot 1.',
    'CRITICAL: Format ("' + formatToken + '") MUST appear in slot 1.',
    isLineArt ? 'CRITICAL: "Line Art" or "Line" or "Ink" or "Hand Drawn" MUST appear somewhere in title.' : '',
    'NO emojis. NO ALL-CAPS. NO weird symbols. Use only A-Z, 0-9, spaces, pipes, apostrophes.',

    '=== TAG FORMULA (exactly 13 tags, 20 chars max, NO duplicates, NO "jpg") ===',

    'TIER 1 (positions 1-3): PRIMARY ANCHORS - high-volume direct search',
    isLineArt
      ? '  Position 1: "{subject} clipart" - example: "cat clipart"\n  Position 2: "line art {subject}" - example: "line art cat"\n  Position 3: "{subject} line art" - example: "cat line art"'
      : '  Position 1: "{subject} clipart" - example: "cat clipart"\n  Position 2: "{vibe} {subject}" - example: "whimsical cat" or "cute cat clipart"\n  Position 3: "watercolor {subject}" - example: "watercolor cat"',

    'TIER 2 (positions 4-6): LONG-TAIL NICHE',
    '  Position 4: "{subject} clip art" (WITH SPACE - secret weapon, low competition)',
    isLineArt
      ? '  Position 5: "{vibe} {subject} clipart" - example: "minimalist cat clipart"\n  Position 6: "{subject} tattoo" - example: "cat tattoo" or "{subject} planner"'
      : '  Position 5: "{vibe} {subject} clipart" - example: "boho cat clipart"\n  Position 6: "{subject} {use-case}" - example: "cat scrapbook" or "cat planner"',

    'TIER 3 (positions 7-9): CROSS-NICHE STYLE BROWSERS',
    isLineArt
      ? '  Position 7: "line art clipart" - this is ALWAYS a tag (top search for this product)\n  Position 8: "minimalist clipart" or "{vibe} clipart" - example: "boho line clipart"\n  Position 9: "ink illustration" - this is ALWAYS a tag (top buyer search in line art)'
      : '  Position 7: "fantasy clipart" - this is ALWAYS a tag (mass-appeal cross-niche)\n  Position 8: "{vibe} clipart" - example: "whimsical clipart" or "boho clipart" or "cottagecore clipart"\n  Position 9: "watercolor clipart" - this is ALWAYS a tag (top buyer search in this category)',

    'TIER 4 (positions 10-13): INTENT/USE-CASE',
    isLineArt
      ? '  Position 10: "junk journal" - high-volume buyer use-case\n  Position 11: "tattoo design" OR "fineline tattoo" - tattoo artist targeted\n  Position 12: "planner stickers" OR "sticker sheet" - planner addict targeted\n  Position 13: UNIQUE long-tail - example: "card making" or "hand drawn art"'
      : '  Position 10: "junk journal" - high-volume buyer use-case\n  Position 11: "sublimation design" OR "scrapbook supplies" - POD/crafter targeted\n  Position 12: "{subject} lover gift" OR "nursery decor" - audience-targeted\n  Position 13: UNIQUE long-tail not covered elsewhere - example: "kids room art" or "card making"',

    'ABSOLUTE RULES:',
    '- "clipart" appears in 4-5 tags (don\'t over-repeat)',
    '- "clip art" (with space) in EXACTLY 1 tag (secret weapon, dont stuff)',
    isLineArt
      ? '- "line art" in 3-4 tags\n- "line art clipart" is ALWAYS a tag\n- "ink illustration" is ALWAYS a tag\n- "tattoo" or "fineline tattoo" in 1-2 tags\n- NEVER use "watercolor" in any tag (this is line art)'
      : '- "watercolor" in 2 tags\n- "fantasy clipart" is ALWAYS tag 7 (or position 6-8 if needed)',
    '- For PNG listings, "png" in 1-2 tags MAX (eg "cat png" + "transparent png")',
    '- For JPG listings, ZERO format tags - replace with "printable" or "digital download"',
    '- NEVER duplicate keywords across tags',
    '- NO tag exactly matches a phrase in the title',

    '=== DESCRIPTION FORMULA (powerful SEO copy) ===',

    'PARAGRAPH 1 (HOOK - first 160 chars are Google snippet, keyword-dense):',
    isLineArt
      ? '  Pattern: "This set includes {count} high-resolution {vibe} {subject} line art clipart {format} files featuring {brief design description}."\n  Naturally include: "line art clipart", subject, vibe, format'
      : '  Pattern: "This set includes {count} high-resolution {vibe} {subject} clipart {format} files featuring {brief design description}."\n  Naturally include: "clipart", subject, vibe, format',

    'PARAGRAPH 2 (VISUAL DESCRIPTION):',
    isLineArt
      ? '  1-2 sentences describing actual designs: thin black line work, hand-drawn ink style, minimalist composition, delicate details. Sensory and evocative.'
      : '  1-2 sentences describing actual designs, colors, mood, art style. Sensory and evocative.',

    'PARAGRAPH 3 (USE-CASES - SEO POWERHOUSE):',
    '  Start: "Perfect for:"',
    isLineArt
      ? '  List 10-12 use-cases comma-separated. MUST include: tattoo flash, fine line tattoos, junk journals, planner stickers, sticker sheets, card making, invitations, junk journal kit, scrapbook accents, gift tags, ephemera collage, hand-lettered cards.'
      : '  List 10-12 use-cases comma-separated. MUST include: scrapbooking, junk journals, planner stickers, sublimation, t-shirt designs, mug designs, card making, invitations, nursery wall art, kids decor, gift tags, sticker sheets.',

    'PARAGRAPH 4 (NICHE CONTEXT - cross-category SEO):',
    isLineArt
      ? '  1 sentence mentioning broader categories. Use 2-3 of these naturally: line art clipart, minimalist illustrations, ink illustrations, hand drawn art, tattoo flash designs, boho line art.\n  Example: "These minimalist illustrations fit beautifully into tattoo flash collections, junk journal projects, and hand drawn art portfolios."'
      : '  1 sentence mentioning broader categories the design fits. Use 2-3 of these naturally: fantasy clipart, whimsical art, boho illustrations, cottagecore aesthetic, kawaii designs, watercolor art.\n  Example: "These whimsical illustrations fit beautifully into fantasy clipart collections, boho aesthetic projects, and watercolor art portfolios."',

    'PARAGRAPH 5 (WHAT YOU GET):',
    '  Start: "WHAT YOU GET:"',
    isLineArt
      ? '  Specific: file count, format (' + formatToken + '), resolution (4032x4032 if upscale ran, otherwise high resolution), hand drawn line art / ink illustration on white background.'
      : '  Specific: file count, format (' + formatToken + '), resolution (4032x4032 if upscale ran, otherwise high resolution), transparent background note if PNG.',

    'PARAGRAPH 6 (COMMERCIAL USE - GOLD for POD sellers):',
    '  Start: "COMMERCIAL USE:"',
    '  State: "Small business commercial use is included! Use these designs on physical products you sell (up to 500 items per design). Please do not resell the files themselves or share them as-is."',

    'PARAGRAPH 7 (CTA):',
    '  1 sentence: purchase, download the file, start creating. Do NOT say ZIP. Do NOT mention country.',

    'FINAL LINE: "Files made with AI."',

    'DESCRIPTION SEO RULES:',
    isLineArt
      ? '- Use "line art" 3-4 times naturally throughout\n- Use the vibe word (whimsical/minimalist/sketchy/etc) 3-4 times\n- Use "ink illustration" or "hand drawn" 2-3 times\n- NEVER use "watercolor" (wrong product)'
      : '- Use "clipart" 3-4 times naturally throughout\n- Use the vibe word (whimsical/fantasy/boho/cute/etc) 3-4 times\n- Use "watercolor" 2-3 times',
    '- ' + formatRule,
    '- NEVER use "jpg" as a search keyword in description (only mention in WHAT YOU GET section as file format)',

    '=== OTHER FIELDS ===',
    isLineArt
      ? 'altBase: 6-10 word SEO phrase. Include subject + "line art" + "clipart" + vibe. Example: "whimsical cat line art clipart ink illustration"'
      : 'altBase: 6-10 word SEO phrase. Include subject + "clipart" + colors + vibe. Example: "cute watercolor cat clipart whimsical pastel fantasy"',
    'primaryColor: dominant color, EXACTLY ONE from: ' + colorList + '.',
    isLineArt
      ? 'For line art on white background, primaryColor is almost always "Black", secondaryColor "White".'
      : 'secondaryColor: second dominant, EXACTLY ONE different from: ' + colorList + '.',
    'artSubject: EXACTLY ONE from: ' + subjectList + '. Cats/dogs/animals=Animal. Flowers=Flowers. Mystical=Fantasy and Sci Fi.',
    'occasion: ONE from: ' + occasionList + '. Use none unless DEFINITIVELY targeting occasion.',
    'holiday: ONE from: ' + holidayList + '. Use none unless DEFINITIVELY that holiday.',
    lineArtVibeOverride,
  ].filter((line) => line.length > 0).join('\n');

  const userMsg = [
    'You have ' + input.fileCount + ' design files in ' + formatToken + ' format' +
    (pngBoost ? ' (with transparent PNG versions in separate folder)' : '') + '.',
    isLineArt ? 'PRODUCT TYPE: LINE ART CLIPART (hand-drawn ink illustrations, NOT watercolor).' : '',
    '',
    'The designs feature: ' + input.imageDescriptions.join(' | '),
    '',
    'YOUR TASK:',
    '1. Identify the MAIN SUBJECT (one word: cat, flower, girl, dragon, etc.)',
    isLineArt
      ? '2. Identify the VIBE/STYLE (one word: whimsical, minimalist, sketchy, fine line, boho, mystical, cute, delicate)'
      : '2. Identify the VIBE/STYLE (one word: cute, whimsical, fantasy, boho, cottagecore, kawaii, vintage, magical, dreamy, wildflower)',
    '3. Hit ALL 4 buyer personas with different keyword angles',
    '4. Follow ALL the tag and description rules with ZERO compromise',
    '5. Make this listing UNSTOPPABLE - bestseller-tier SEO',
    '',
    'CRITICAL REMINDERS:',
    '- NO "jpg" anywhere in tags (buyers dont search this way)',
    '- "clip art" (with space) in exactly 1 tag (secret weapon)',
    isLineArt
      ? '- "line art clipart" MUST be a tag\n- NEVER use "watercolor" anywhere'
      : '- "fantasy clipart" MUST be a tag',
    '- Use vibe word everywhere (title, tags, description)',
    '',
    'Return JSON now.',
  ].filter((line) => line.length > 0).join('\n');

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

  const blockedTagPatterns = [
    /\bjpg\b/i,
    /\bjpeg\b/i,
  ];

  // Line art mode: ayrıca watercolor tag'lerini de blokla
  const lineArtBlockedPatterns = isLineArt ? [/\bwatercolor\b/i] : [];

  const cleanTags: string[] = [];
  for (const t of parsed.tags) {
    const tag = String(t).trim().toLowerCase();
    if (tag.length === 0 || tag.length > 20) continue;
    if (blockedTagPatterns.some((p) => p.test(tag))) continue;
    if (lineArtBlockedPatterns.some((p) => p.test(tag))) continue;
    if (cleanTags.indexOf(tag) !== -1) continue;
    cleanTags.push(tag);
  }

  // Safety net: ensure required tags exist (productType'a göre değişir)
  const requiredTags = isLineArt
    ? ['line art clipart', 'ink illustration']
    : ['fantasy clipart', 'watercolor clipart'];
  for (const required of requiredTags) {
    if (cleanTags.indexOf(required) === -1 && cleanTags.length < 13) {
      cleanTags.push(required);
    }
  }

  // Fill remaining with smart fallback
  const fillers = isLineArt
    ? ['line art', 'minimalist clipart', 'hand drawn art', 'tattoo design', 'junk journal', 'fineline tattoo', 'sticker sheet', 'card making']
    : pngBoost
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
    parsed.altBase = isLineArt ? 'whimsical line art clipart ink illustration' : 'watercolor clipart design';
  }
  if (typeof parsed.primaryColor !== 'string') parsed.primaryColor = '';
  if (typeof parsed.secondaryColor !== 'string') parsed.secondaryColor = '';
  if (typeof parsed.artSubject !== 'string') parsed.artSubject = '';
  if (typeof parsed.occasion !== 'string') parsed.occasion = 'none';
  if (typeof parsed.holiday !== 'string') parsed.holiday = 'none';

  return parsed;
}
