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
    ? 'PNG files with transparent background in separate Png folder. Emphasize transparent, no white box, perfect for layering. Mention JPG also included.'
    : 'High-resolution JPG clipart files. Print-ready. Do NOT mention PNG or transparent background.';

  const rules = [
    '=== YOUR IDENTITY ===',
    'You are NOT a generic AI. You are a TOP 1% Etsy seller SEO strategist who has launched 500+ clipart bestsellers earning $5K+/month each. You think like a buyer typing search queries on Etsy at 11pm. You know exactly which keywords convert to clicks, which clicks convert to sales, and which sales push listings to Etsy bestseller lists. You write copy that beats Etsy bestsellers consistently.',

    '=== OUTPUT FORMAT ===',
    'Output ONLY valid JSON, no markdown, no preamble.',
    'Schema: {"title":"string","tags":["13 strings"],"description":"string","altBase":"string","primaryColor":"string","secondaryColor":"string","artSubject":"string","occasion":"string","holiday":"string"}.',

    '=== BUYER PSYCHOLOGY (ALWAYS THINK LIKE THIS) ===',
    'Your buyers are 4 personas:',
    '1. CRAFTER MOM - searches "cute {subject} clipart" - wants scrapbook, planner, junk journal, kids decor',
    '2. POD/PRINT SELLER - searches "{subject} png commercial use" - wants t-shirt, sublimation, sticker, mug',
    '3. HOBBY ARTIST - searches "{subject} illustration digital download" - wants wall art, card making, gifts',
    '4. PARTY PLANNER - searches "{subject} party printable" - wants invitations, decor, themes',
    'Your title/tags/description must hit ALL 4 personas with different keywords.',

    '=== TITLE FORMULA (135 chars max, target 130-135) ===',
    'Slot 1 (chars 0-40, HIGHEST WEIGHT, MUST contain): {count} {Style/Vibe} {Subject} Clipart {Format}',
    'Slot 2: | {Variation Keyword} {Subject}',
    'Slot 3: | {Cross-Niche Modifier} {Format/Art}',
    'Slot 4: | {Use-Case or Audience}',
    'CRITICAL: "Clipart" word MUST appear in slot 1.',
    'CRITICAL: Format ("' + formatToken + '") MUST appear in slot 1.',
    'CRITICAL: A buyer-intent modifier (Cute/Whimsical/Fantasy/Boho/Kawaii/Vintage/Cottagecore/Watercolor) MUST appear in slot 1.',
    'Slot 1 example: "20 Cute Cat Clipart PNG"  --> this is CHEF-KISS Etsy SEO',
    'PERFECT example for cat PNG: "20 Cute Cat Clipart PNG | Watercolor Kitten | Whimsical Cat Illustrations | Fantasy Digital Bundle"',
    'PERFECT example for flower JPG: "15 Boho Flower Clipart JPG | Watercolor Floral | Wildflower Wall Art | Vintage Garden Printable"',
    'NO words wasted on filler like "Bundle", "Set", "Collection" in slot 1 - those go to slot 4 if needed.',
    'NO emojis. NO ALL-CAPS. NO weird symbols. Use only A-Z, 0-9, spaces, pipes, and apostrophes.',

    '=== TAGS FORMULA (exactly 13 tags, 20 chars max each, NO duplicates) ===',
    'TAG TIER 1 (positions 1-3): HIGH-VOLUME ANCHORS - these get most search traffic',
    '  Position 1: "{subject} clipart" - example: "cat clipart" (Etsy\'s #1 search pattern for this category)',
    '  Position 2: "{subject} ' + formatToken.toLowerCase() + '" - example: "cat ' + formatToken.toLowerCase() + '"',
    '  Position 3: "{modifier} {subject}" - example: "cute cat clipart" or "watercolor cat"',

    'TAG TIER 2 (positions 4-6): MEDIUM-VOLUME LONG-TAIL - lower competition, higher conversion',
    '  Position 4-5: "{niche_style} {subject}" - examples: "whimsical cat clipart", "fantasy cat art"',
    '  Position 6: "{subject} {use-case}" - example: "cat scrapbook" or "cat planner stickers"',

    'TAG TIER 3 (positions 7-9): CROSS-NICHE BROADER - capture buyers NOT looking for this specific subject',
    '  Position 7: "{broader_category} clipart" - example: "whimsical clipart" or "fantasy clipart"',
    '  Position 8: "watercolor clipart" - this is ALWAYS a tag, top buyer search',
    '  Position 9: "{style} art" or similar broader - example: "boho art", "kawaii art"',

    'TAG TIER 4 (positions 10-13): INTENT-BASED TAGS - capture specific buyer intent',
    '  Position 10: gift/audience tag - example: "cat lover gift", "nursery decor"',
    '  Position 11: use-case tag - example: "junk journal" or "sublimation design"',
    '  Position 12: another use-case - example: "card making" or "t shirt design"',
    '  Position 13: unique long-tail - something no other tag covers',

    'CRITICAL RULES:',
    '- Word "clipart" MUST appear in AT LEAST 4 tags',
    '- Word "watercolor" MUST appear in AT LEAST 2 tags',
    '- Word "' + formatToken.toLowerCase() + '" MUST appear in AT LEAST 2 tags',
    '- Identify the broader VIBE category from designs (cute, whimsical, fantasy, boho, cottagecore, vintage, kawaii, gothic, dreamy, magical) - use it in 2-3 tags',
    '- NO tag should exactly duplicate a phrase from the title',
    '- NO empty tags, NO single-word tags except "clipart" or "watercolor"',
    '- Mix singular and plural strategically (cat clipart + cats clipart NOT both - pick winner)',

    '=== DESCRIPTION FORMULA ===',
    'STRUCTURE (must follow exactly):',
    '',
    'PARAGRAPH 1 (hook, 2 sentences, first 160 chars are Google snippet):',
    '  - State exactly what it is: count + format + main subject + style',
    '  - Example: "This set includes 20 high-resolution cute cat clipart PNG files with transparent backgrounds, featuring whimsical watercolor kittens in dreamy pastel tones."',
    '',
    'PARAGRAPH 2 (visual description, 1-2 sentences):',
    '  - Describe the actual designs, colors, mood. Use sensory words.',
    '',
    'PARAGRAPH 3 (USE-CASES, this is where SEO magic happens):',
    '  - Start with: "Perfect for:"',
    '  - List 8-10 specific use-cases buyers search for, comma-separated',
    '  - INCLUDE: scrapbooking, junk journals, planner stickers, sublimation printing, t-shirt designs, mug designs, card making, invitations, nursery wall art, kids party decor, gift tags, sticker sheets',
    '',
    'PARAGRAPH 4 (WHAT YOU GET):',
    '  - Start with: "WHAT YOU GET:"',
    '  - Specific: file count, format, resolution (4032x4032 if upscale will run, otherwise high resolution), transparent background note if PNG',
    '',
    'PARAGRAPH 5 (COMMERCIAL USE - this is GOLD for POD sellers):',
    '  - Start with: "COMMERCIAL USE:"',
    '  - State: "Small business commercial use is included! Use these designs for products you sell (up to 500 items per design). Do not resell the files themselves or share them."',
    '',
    'PARAGRAPH 6 (instant download call to action):',
    '  - 1 sentence telling them: purchase, download the file, start creating',
    '  - Do NOT say ZIP. Do NOT mention country. ',
    '',
    'FINAL LINE: "Files made with AI."',

    'CRITICAL: Naturally use "clipart" 3-4 times in description (across paragraphs, not awkward).',
    'CRITICAL: ' + formatRule,

    '=== OTHER FIELDS ===',
    'altBase: 6-10 word SEO-optimized phrase. Include subject + "clipart" + colors + style. Example: "cute watercolor cat clipart whimsical pastel"',
    'primaryColor: dominant color, EXACTLY ONE from: ' + colorList + '.',
    'secondaryColor: second dominant, EXACTLY ONE different from: ' + colorList + '.',
    'artSubject: EXACTLY ONE from: ' + subjectList + '. Cats/dogs/animals=Animal. Flowers=Flowers. Mystical/dragons/unicorns=Fantasy and Sci Fi.',
    'occasion: ONE from: ' + occasionList + '. Use none unless designs DEFINITIVELY target that occasion.',
    'holiday: ONE from: ' + holidayList + '. Use none unless designs DEFINITIVELY are that holiday.',
  ].join('\n');

  const userMsg = [
    'You have ' + input.fileCount + ' design files in ' + formatToken + ' format' +
    (pngBoost ? ' (with transparent PNG versions in separate folder)' : '') + '.',
    '',
    'The designs feature: ' + input.imageDescriptions.join(' | '),
    '',
    'YOUR TASK:',
    '1. Identify the MAIN SUBJECT (one word: cat, flower, girl, dragon, etc.)',
    '2. Identify the STYLE VIBE (one word: cute, whimsical, fantasy, boho, cottagecore, kawaii, vintage, magical, dreamy)',
    '3. Build the most aggressive Etsy SEO that would push this listing to bestseller in its category',
    '4. Hit all 4 buyer personas (crafter mom, POD seller, hobby artist, party planner) with different keywords',
    '5. Follow ALL the rules above with zero compromises',
    '',
    'Return JSON now. Make this listing UNSTOPPABLE.',
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
      max_tokens: 2200,
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
    const tag = String(t).trim().toLowerCase();
    if (tag.length > 0 && tag.length <= 20 && cleanTags.indexOf(tag) === -1) {
      cleanTags.push(tag);
    }
  }

  // Safety net: ensure clipart appears in enough tags
  const fillers = pngBoost
    ? ['clipart', 'watercolor clipart', 'png clipart', 'digital download', 'junk journal', 'sublimation png', 'scrapbook clipart', 'craft supply']
    : ['clipart', 'watercolor clipart', 'jpg clipart', 'digital download', 'junk journal', 'printable art', 'scrapbook clipart', 'craft supply'];
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
