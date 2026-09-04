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

const BONUS_GIFT_NOTE = [
  '',
  '─────────────────────────',
  '🎁 SPECIAL BONUS GIFT',
  'As a thank you for supporting our small studio, every order includes a FREE bonus pack of 100+ additional designs - automatically delivered with your bundle. A little something from our hearts to yours 🤍',
  '─────────────────────────',
].join('\n');

const AI_DISCLOSURE_NOTE = [
  '',
  '─────────────────────────',
  '🎨 AI-ASSISTED DESIGN DISCLOSURE',
  'These artworks were created with the assistance of Artificial Intelligence (AI) generation tools. As the designer, I direct the creative process: I choose the concepts, style direction, color palettes, and curate the final selections. Each design is reviewed, refined, and prepared by me for commercial-quality download. Designed by seller using AI generators.',
  '─────────────────────────',
].join('\n');

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

  const lineArtVibeOverride = isLineArt
    ? 'CRITICAL LINE ART MODE OVERRIDE: This is a LINE ART / ink illustration bundle, NOT watercolor. ' +
      'Use vibe words from: Minimalist, Sketchy, Hand-Drawn, Fine Line, Bold Line, Boho, Mystical, Delicate, Tattoo Flash, Whimsical, Gothic, Folk. ' +
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
    isLineArt ? '1. TATTOO ARTIST - types "{subject} fine line tattoo" or "{subject} tattoo flash" - wants ready-to-tattoo designs' : '1. CRAFTER MOM - types "{subject} clipart" or "cute {subject} clipart" - wants scrapbook, junk journal, planner',
    isLineArt ? '2. JUNK JOURNALER - types "{subject} line art junk journal" or "ink illustration ephemera" - wants printable art' : '2. POD/PRINT SELLER - types "{subject} png" or "{subject} sublimation png" - wants t-shirt, mug, tumbler, sticker. THIS PERSONA SEARCHES BY FORMAT: "{theme} png" is one of the highest volume query patterns on Etsy.',
    isLineArt ? '3. PLANNER/STICKER MAKER - types "{subject} line art sticker" or "minimalist {subject}" - wants planner content' : '3. HOBBY ARTIST - types "{subject} illustration digital download" - wants wall art, card making',
    isLineArt ? '4. NICHE BROWSER - types "minimalist clipart" or "line art clipart" (no subject) - browsing by style' : '4. STYLE BROWSER - types "{vibe} clipart" e.g. "cottagecore clipart", "quirky clipart", "retro clipart" - browsing by aesthetic, no subject in mind',

    '=== CRITICAL TAG RULES (most important section) ===',
    'NEVER use "{subject} jpg" or "jpg clipart" or anything with "jpg" - buyers NEVER search this way.',
    'DO use the format word "png" ONLY if pngBoost is true (transparent PNG actually exists).',
    'For non-PNG listings, replace format tags with niche/style tags or "printable" tags.',
    'Use "clip art" (with space) in EXACTLY 1 tag - this is a different Etsy keyword than "clipart" and has lower competition.',
    isLineArt
      ? 'ALWAYS include "line art clipart" as primary tag (this is the core search term for this product).'
      : 'Cross-niche style tag must GENUINELY match the designs. Do not force "fantasy clipart" onto a birthday or kitchen set - pick the style tag that actually fits.',

    '=== TITLE FORMULA (HARD LIMIT: max 13 words, max 130 chars) ===',
    'CRITICAL WORD COUNT RULE: Title must have AT MOST 13 words. Count carefully. 14+ words = REJECTED.',
    'A "word" = space-separated token. Numbers count as 1 word. Pipe | is a separator, not a word.',
    '',
    '*** NEW STRUCTURE - SUBJECT FIRST, CLEAN ENTRY ***',
    'Slot 1 must be the CLEANEST, most direct match to what a buyer types. No adjectives, no style words.',
    '',
    'Slot 1 (3-5 words, MOST IMPORTANT): {number} {Subject} Clipart {Format}',
    '  - NO vibe word here. NO "Watercolor" here. Just the plain product.',
    '  - MUST start with a NUMBER (count of items: 20, 30, 150, etc.)',
    '  - "Format" = "' + formatToken + '"',
    isLineArt
      ? '  - Example: "30 Cat Clipart PNG" (4 words)'
      : '  - Example: "30 Cat Clipart PNG" (4 words)',
    '',
    'Slot 2 (3-5 words): | {Style words} {Subject Variation}',
    isLineArt
      ? '  - This is where "Line Art" / "Ink" and the vibe word live.\n  - Example: "Fine Line Ink Tattoo Flash"'
      : '  - This is where "Watercolor" and the vibe word live.\n  - Example: "Watercolor Cottagecore Kitten Bundle"',
    '',
    'Slot 3 (2-4 words): | {Use-case or audience}',
    isLineArt
      ? '  - Example: "Junk Journal Planner"'
      : '  - Example: "Scrapbook Junk Journal"',
    '',
    'EXAMPLES of CORRECT (13 words or less):',
    isLineArt
      ? '- "30 Cat Clipart PNG | Fine Line Ink Tattoo Flash | Junk Journal Planner" = 12 words\n- "20 Botanical Clipart PNG | Minimalist Hand Drawn Line Art | Sticker Sheets" = 12 words'
      : '- "30 Cat Clipart PNG | Watercolor Quirky Kitten Bundle | Scrapbook Junk Journal" = 12 words\n- "25 Highland Cow Clipart PNG | Watercolor Folk Art Farmhouse | Craft Supply" = 12 words\n- "40 Mushroom Clipart PNG | Watercolor Cottagecore Forest Set | Junk Journal" = 11 words',
    '',
    'EXAMPLES of WRONG:',
    '- "30 Whimsical Cat Clipart PNG | Watercolor Abstract Kitten | Scrapbook Crafts" - vibe word is in Slot 1, must move to Slot 2',
    '- "20 Cat Clipart PNG | Cute Watercolor Kitten Design | Fantasy Cat Art | Scrapbook Junk Journal" = 16 words, too long',
    '',
    '🎂 SPECIAL THEME OVERRIDES (these change Slot 1):',
    '- BIRTHDAY designs (cake, candles, party, balloons): Slot 1 MUST contain "Happy Birthday Clipart" exact phrase. Example: "100 Happy Birthday Clipart PNG | Watercolor Cake Candles Bundle | Card Making"',
    '- CHRISTMAS designs: Slot 1 = "{number} Christmas {Subject} Clipart {Format}". Example: "30 Christmas Cat Clipart PNG | Watercolor Whimsical Santa Kitten | Holiday Cards"',
    '- HALLOWEEN: Slot 1 = "{number} Halloween {Subject} Clipart {Format}". Example: "25 Halloween Cat Clipart PNG | Watercolor Spooky Witch Kitten | Party Decor"',
    '- EASTER / WEDDING / VALENTINE / THANKSGIVING: same pattern, holiday word goes in Slot 1 before the subject.',
    '- Seasonal listings are searched as "{holiday} {subject} clipart" and "{holiday} png" - the holiday word MUST be early.',
    '',
    'CRITICAL RULES (ALL apply):',
    '- MUST start with a number (the design count)',
    '- "Clipart" MUST appear in Slot 1',
    isLineArt
      ? '- "Line Art" or "Ink" or "Line" MUST appear in Slot 2'
      : '- "Watercolor" MUST appear in Slot 2 (NOT Slot 1)',
    '- A vibe modifier MUST appear in Slot 2 (see VIBE SELECTION section - do NOT default to Whimsical)',
    '- Format ("' + formatToken + '") MUST appear in Slot 1',
    '- HARD LIMIT: 13 words max, 130 chars max',
    '- NO emojis, NO ALL-CAPS, NO weird symbols',
    '- Only A-Z, 0-9, spaces, pipes (|), apostrophes',

    isLineArt ? '' : '=== VIBE SELECTION (CRITICAL - READ CAREFULLY) ===',
    isLineArt ? '' : 'STOP DEFAULTING TO "WHIMSICAL". Whimsical is ONE option among many, not a fallback.',
    isLineArt ? '' : 'Over-using one vibe word makes the shop look repetitive and wastes cross-niche search traffic.',
    isLineArt ? '' : 'LOOK at the design descriptions and pick the vibe that a buyer would actually type. Decision guide:',
    isLineArt ? '' : '- QUIRKY: animals dressed as humans, animals doing human activities (cooking, reading, riding bikes), odd proportions, comic expressions, unexpected pairings, humorous scenes. THIS IS VERY COMMON - use it confidently.',
    isLineArt ? '' : '- COTTAGECORE: mushrooms, cottages, wildflowers, rural nostalgia, jam jars, gardening, muted sage and cream palette, forest creatures',
    isLineArt ? '' : '- BOHO: earthy neutral tones, terracotta, pampas grass, arches, desert, macrame, muted browns and rust',
    isLineArt ? '' : '- CUTE: simple rounded shapes, big eyes, baby animals, pastel, nothing complex or odd',
    isLineArt ? '' : '- KAWAII: ultra-cute Japanese style, blush cheeks, tiny simple faces, candy colors',
    isLineArt ? '' : '- VINTAGE: antique, sepia, aged paper, victorian, retro ephemera, faded tones',
    isLineArt ? '' : '- RETRO: mid century modern, 1970s groovy, bold flat shapes, orange brown mustard palette',
    isLineArt ? '' : '- FOLK ART: decorative symmetrical patterns, traditional motifs, flat stylised shapes, scandinavian or eastern european feel',
    isLineArt ? '' : '- FANTASY: dragons, fairies, unicorns, magical creatures, mythical themes',
    isLineArt ? '' : '- MAGICAL: sparkles, stars, moons, celestial, glowing, mystical light',
    isLineArt ? '' : '- DREAMY: soft hazy pastel washes, ethereal, gentle gradients, cloud-like',
    isLineArt ? '' : '- WILDFLOWER: meadow flowers dominate the composition, botanical heavy',
    isLineArt ? '' : '- GOTHIC: dark moody palette, ravens, skulls, black lace, victorian mourning',
    isLineArt ? '' : '- FASHION: stylish dressed figures, outfits, accessories, chic women',
    isLineArt ? '' : '- WHIMSICAL: gentle storybook charm, soft illustrated fairytale feel. USE ONLY when no other vibe above fits better.',
    isLineArt ? '' : 'Before choosing, ask: "would a buyer searching this vibe word actually expect to see these designs?" If not, pick another.',
    isLineArt ? '' : 'If designs show anthropomorphic animals with clothing or human activities, QUIRKY is almost always the better choice than Whimsical.',

    '=== TAG FORMULA (exactly 13 tags, 20 chars max, NO duplicates, NO "jpg") ===',

    'TIER 1 (positions 1-3): PRIMARY ANCHORS - highest volume direct search',
    isLineArt
      ? '  Position 1: "{subject} clipart" - example: "cat clipart"\n  Position 2: "line art {subject}" - example: "line art cat"\n  Position 3: "{subject} line art" - example: "cat line art"'
      : pngBoost
      ? '  Position 1: "{subject} clipart" - example: "cat clipart"\n  Position 2: "{subject} png" - example: "cat png" (FORMAT SEARCH - very high volume)\n  Position 3: "watercolor {subject}" - example: "watercolor cat"'
      : '  Position 1: "{subject} clipart" - example: "cat clipart"\n  Position 2: "watercolor {subject}" - example: "watercolor cat"\n  Position 3: "{subject} printable" or "printable {subject}"',

    'TIER 2 (positions 4-6): LONG-TAIL NICHE - lower competition',
    '  Position 4: "{subject} clip art" (WITH SPACE - secret weapon, low competition)',
    isLineArt
      ? '  Position 5: "{vibe} {subject}" - example: "minimalist cat"\n  Position 6: "{subject} tattoo" or "{subject} planner"'
      : '  Position 5: "{vibe} {subject}" - example: "quirky cat" or "cottagecore cat"\n  Position 6: "{subject} bundle" or "{subject} {use-case}" - example: "cat scrapbook"',

    'TIER 3 (positions 7-9): STYLE BROWSERS + SEASONAL',
    isLineArt
      ? '  Position 7: "line art clipart" - ALWAYS a tag\n  Position 8: "{vibe} clipart" - example: "minimalist clipart"\n  Position 9: "ink illustration" - ALWAYS a tag'
      : '  Position 7: "{vibe} clipart" - example: "quirky clipart", "cottagecore clipart", "retro clipart". MUST match the vibe you chose in the title.\n  Position 8: "watercolor clipart" - ALWAYS a tag (top buyer search in this category)\n  Position 9: SEASONAL OR CROSS-NICHE. If the set is holiday themed use "{holiday} clipart" or "{holiday} png" (e.g. "christmas png", "halloween clipart"). If NOT seasonal, use a genuine cross-niche style tag that fits ("fantasy clipart", "boho clipart", "farmhouse decor" etc). Do NOT force a style tag that does not match the designs.',

    'TIER 4 (positions 10-13): INTENT / USE-CASE / AUDIENCE',
    isLineArt
      ? '  Position 10: "junk journal"\n  Position 11: "tattoo design" OR "fineline tattoo"\n  Position 12: "planner stickers" OR "sticker sheet"\n  Position 13: UNIQUE long-tail - example: "card making" or "hand drawn art"'
      : '  Position 10: "junk journal" - high-volume buyer use-case\n  Position 11: ' + (pngBoost ? '"sublimation design" or "transparent png" - POD seller targeted' : '"scrapbook supplies" or "printable art" - crafter targeted') + '\n  Position 12: AUDIENCE tag - "{subject} lover gift", "cat mom gift", "nursery decor", "kitchen decor" - pick what genuinely fits\n  Position 13: UNIQUE long-tail not covered elsewhere - example: "card making", "sticker sheet", "tumbler wrap", "kids room art"',

    'ABSOLUTE TAG RULES:',
    '- "clipart" appears in 4-5 tags (do not over-repeat)',
    '- "clip art" (with space) in EXACTLY 1 tag',
    isLineArt
      ? '- "line art" in 3-4 tags\n- "line art clipart" is ALWAYS a tag\n- "ink illustration" is ALWAYS a tag\n- "tattoo" or "fineline tattoo" in 1-2 tags\n- NEVER use "watercolor" in any tag (this is line art)'
      : '- "watercolor" in 2-3 tags\n- "watercolor clipart" is ALWAYS a tag\n- The vibe word you chose for the title MUST appear in 2 tags',
    pngBoost
      ? '- "png" in 2-3 tags (e.g. "cat png", "transparent png", "christmas png") - format search is high volume, use it'
      : '- ZERO format tags - replace with "printable", "digital download", "printable art"',
    '- If the set is SEASONAL, at least 2 tags must carry the holiday word - seasonal search spikes hard and early',
    '- NEVER duplicate keywords across tags',
    '- NO tag exactly matches a phrase in the title',
    '- Every tag must be something a real buyer would type into Etsy search. If you would not type it, do not use it.',

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

    'PARAGRAPH 7 (CTA - FINAL paragraph of YOUR output):',
    '  1 sentence: purchase, download the file, start creating. Do NOT say ZIP. Do NOT mention country.',

    'IMPORTANT: Do NOT add any AI disclosure or "Files made with AI" line - this is appended automatically by the system after your output. End your description after the CTA paragraph.',

    'DESCRIPTION SEO RULES:',
    isLineArt
      ? '- Use "line art" 3-4 times naturally throughout\n- Use the vibe word (minimalist/sketchy/fine line/etc) 3-4 times\n- Use "ink illustration" or "hand drawn" 2-3 times\n- NEVER use "watercolor" (wrong product)'
      : '- Use "clipart" 3-4 times naturally throughout\n- Use the vibe word you chose 3-4 times (whatever it is - quirky, cottagecore, boho, etc)\n- Use "watercolor" 2-3 times',
    '- ' + formatRule,
    '- NEVER use "jpg" as a search keyword in description (only mention in WHAT YOU GET section as file format)',

    '=== OTHER FIELDS ===',
    isLineArt
      ? 'altBase: 6-10 word SEO phrase. Include subject + "line art" + "clipart" + vibe. Example: "quirky cat line art clipart ink illustration"'
      : 'altBase: 6-10 word SEO phrase. Include subject + "clipart" + colors + vibe. Example: "quirky watercolor cat clipart pastel cottagecore"',
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
    '1. Identify the MAIN SUBJECT (one word: cat, flower, girl, dragon, mushroom, cow, etc.)',
    isLineArt
      ? '2. Identify the VIBE/STYLE (one word: minimalist, sketchy, fine line, bold line, boho, mystical, delicate, whimsical, gothic, folk)'
      : '2. Choose the VIBE using the VIBE SELECTION decision guide. Do NOT default to whimsical. Look at what the designs actually show and pick the word a buyer would type. Anthropomorphic animals in clothing or doing human activities = QUIRKY.',
    '3. Check if this is SEASONAL (christmas, halloween, easter, valentine, thanksgiving, birthday, wedding). If yes, the theme word goes in Slot 1 of the title and into 2 tags.',
    '4. Hit ALL 4 buyer personas with different keyword angles',
    '5. Follow ALL the title and tag rules with ZERO compromise',
    '6. Make this listing UNSTOPPABLE - bestseller-tier SEO',
    '',
    'CRITICAL REMINDERS:',
    '- TITLE SLOT 1 = "{number} {Subject} Clipart ' + formatToken + '" - clean and direct, NO vibe word, NO "Watercolor"',
    isLineArt
      ? '- TITLE SLOT 2 = style words, "Line Art" or "Ink" MUST be here'
      : '- TITLE SLOT 2 = "Watercolor" + vibe word live HERE, not in Slot 1',
    '- TITLE: MAX 13 WORDS. Count words carefully. 14+ words = REJECTED. Aim for 11-12 words.',
    '- TITLE: MUST start with a NUMBER (item count)',
    '- SEASONAL: holiday word goes into Slot 1 right before the subject',
    '- BIRTHDAY designs: Slot 1 MUST contain "Happy Birthday Clipart" exact phrase',
    isLineArt ? '' : '- VIBE: whimsical is NOT the default. Quirky, cottagecore, boho, retro, vintage, folk art, fantasy, cute are all equally valid. Pick what genuinely matches.',
    '- NO "jpg" anywhere in tags (buyers dont search this way)',
    '- "clip art" (with space) in exactly 1 tag (secret weapon)',
    pngBoost && !isLineArt ? '- "{subject} png" MUST be a tag - format search is one of the highest volume patterns' : '',
    isLineArt
      ? '- "line art clipart" MUST be a tag\n- NEVER use "watercolor" anywhere'
      : '- "watercolor clipart" MUST be a tag',
    '- Every tag must be a phrase a real buyer would type. No filler.',
    '- End description after CTA - do NOT add AI disclosure (system adds it)',
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

  // CRITICAL: Title HARD validation - 13 words max + 130 chars max
  if (parsed.title.length > 130) {
    parsed.title = parsed.title.slice(0, 130).trim();
  }
  // Word count validation - asla 13'u gecmesin
  const titleWords = parsed.title.split(/\s+/).filter((w) => w.length > 0 && w !== '|');
  if (titleWords.length > 13) {
    // Pipe konumlarini koru, sadece word'leri kes
    const tokens = parsed.title.split(/\s+/);
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
    // Sondaki yetim pipe'i temizle
    while (kept.length > 0 && kept[kept.length - 1] === '|') kept.pop();
    parsed.title = kept.join(' ').trim();
  }

  if (!Array.isArray(parsed.tags)) parsed.tags = [];

  const blockedTagPatterns = [
    /\bjpg\b/i,
    /\bjpeg\b/i,
  ];

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

  // Zorunlu taglar - "fantasy clipart" artik zorunlu degil (tema uymayabilir)
  const requiredTags = isLineArt
    ? ['line art clipart', 'ink illustration']
    : ['watercolor clipart'];
  for (const required of requiredTags) {
    if (cleanTags.indexOf(required) === -1 && cleanTags.length < 13) {
      cleanTags.push(required);
    }
  }

  const fillers = isLineArt
    ? ['line art', 'minimalist clipart', 'hand drawn art', 'tattoo design', 'junk journal', 'fineline tattoo', 'sticker sheet', 'card making']
    : pngBoost
    ? ['clipart', 'transparent png', 'junk journal', 'sublimation design', 'digital download', 'scrapbook supplies', 'craft supply', 'card making']
    : ['clipart', 'printable art', 'junk journal', 'digital download', 'scrapbook supplies', 'card making', 'craft supply', 'sticker sheet'];

  let fi = 0;
  while (cleanTags.length < 13 && fi < fillers.length) {
    if (cleanTags.indexOf(fillers[fi]) === -1) cleanTags.push(fillers[fi]);
    fi++;
  }
  parsed.tags = cleanTags.slice(0, 13);

  if (typeof parsed.description !== 'string') parsed.description = '';

  // 1. AI Disclosure (Etsy 2026 Creativity Standards compliance)
  parsed.description = parsed.description.trimEnd() + '\n' + AI_DISCLOSURE_NOTE;

  // 2. Bonus Gift mesaji
  parsed.description = parsed.description.trimEnd() + '\n' + BONUS_GIFT_NOTE;

  // 3. Whole shop notu (varsa) en sona
  if (input.folderNumber && input.folderNumber.length > 0) {
    parsed.description = parsed.description.trimEnd() + '\n' + buildWholeShopNote(input.folderNumber);
  }

  if (typeof parsed.altBase !== 'string' || parsed.altBase.length === 0) {
    parsed.altBase = isLineArt ? 'line art clipart ink illustration' : 'watercolor clipart design';
  }
  if (typeof parsed.primaryColor !== 'string') parsed.primaryColor = '';
  if (typeof parsed.secondaryColor !== 'string') parsed.secondaryColor = '';
  if (typeof parsed.artSubject !== 'string') parsed.artSubject = '';
  if (typeof parsed.occasion !== 'string') parsed.occasion = 'none';
  if (typeof parsed.holiday !== 'string') parsed.holiday = 'none';

  return parsed;
}
