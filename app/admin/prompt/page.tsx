'use client';

import { useState } from 'react';

type FormulaKey = 'quirky' | 'wordart' | 'artistic_woman' | 'praying' | 'ephemera' | 'birthday_girl' | 'line_art_bw' | 'line_art_accent' | 'line_art_wash' | 'viral_western';

const FORMULAS: Record<FormulaKey, { name: string; icon: string; placeholder: string; description: string }> = {
  quirky: { name: 'Quirky Animal', icon: '🐱', placeholder: 'cat, owl, highland cow, fox...', description: 'Komik hayvan + glossy eyes + deadpan + boots' },
  wordart: { name: 'Word Art (Meslek)', icon: '✨', placeholder: 'NURSE, DOCTOR, TEACHER, MOM...', description: 'Sublimation tipografi + rhinestones + objeler' },
  artistic_woman: { name: 'Artistic Woman', icon: '🎨', placeholder: 'serene calm, melancholic, passionate...', description: 'Sanatsal portre + duygu + watercolor splash' },
  praying: { name: 'Praying Woman', icon: '🙏', placeholder: 'Black woman, woman, African American woman...', description: 'Dua pozları + maneviyat + ışık' },
  ephemera: { name: 'Ephemera (Junk Journal)', icon: '📜', placeholder: 'vintage, botanical, gothic, floral, travel, purple...', description: 'Sheet veya tek öğe kit' },
  birthday_girl: { name: 'Birthday Girl (Glam)', icon: '🎂', placeholder: 'Parisian, modern, vintage, boho...', description: 'Fashion illustration + kutlama pozları' },
  line_art_bw: { name: 'Line Art — Pure B&W', icon: '🖋️', placeholder: 'highland cow, eye, peeking cat, floral skull... (veya boş bırak)', description: 'Sketchy siyah mürekkep, tek tip line, monokrom' },
  line_art_accent: { name: 'Line Art — Accent', icon: '✒️', placeholder: 'highland cow, moon hand, owl... (veya boş bırak)', description: 'Siyah line + tek vurgu rengi (altın/kırmızı)' },
  line_art_wash: { name: 'Line Art — Watercolor Wash', icon: '🎐', placeholder: 'highland cow, fairy, mushroom... (veya boş bırak)', description: 'Siyah çizgi + yumuşak suluboya leke' },
  viral_western: { name: 'Viral Western', icon: '🤠', placeholder: 'goat, highland cow, frog, raccoon...', description: 'Komik hayvan + slogan + checkerboard' },
};

const QUIRKY_POSES = [
  'struggling to carry an enormous bouquet of giant flowers much bigger than itself',
  'wearing a flower crown in a field of tall daisies',
  'holding a tiny umbrella made of flower petals under falling petals',
  'riding a tiny vintage bicycle with a flower basket full of daisies',
  'holding a tiny watering can watering a single tall flower',
  'hopelessly tangled in long vines of summer flowers',
  'holding a large empty blank wooden frame decorated with daisies and copy space',
  'sipping from a tiny floral teacup with flowers around it',
  'reaching up to chase a butterfly among tall wildflowers',
  'peeking out from behind one giant oversized daisy flower',
];

const WORDART_PROFESSIONS: Record<string, { icons: string; color: string }> = {
  NURSE: { icons: 'a big stethoscope wrapping around the letters, a syringe, colorful pills, a nurse cap, an EKG heartbeat line', color: 'purple teal orange' },
  DOCTOR: { icons: 'a big stethoscope wrapping around the letters, a caduceus medical symbol, colorful pills, a syringe, a medical cross', color: 'blue teal purple' },
  TEACHER: { icons: 'a big yellow pencil, a red apple, stacked books, a graduation cap, an ABC chalkboard', color: 'pink orange teal' },
  HAIRSTYLIST: { icons: 'open scissors, a comb, a hairdryer, a spray bottle, hair clips', color: 'purple pink gold' },
  BARISTA: { icons: 'a takeaway coffee cup, scattered coffee beans, a milk pitcher, latte art heart, a coffee grinder', color: 'brown caramel teal' },
  VET: { icons: 'a stethoscope, a paw print, a cute dog and cat, a syringe, a medical cross', color: 'teal purple orange' },
  BAKER: { icons: 'a whisk, a rolling pin, a cupcake, a stand mixer, a flour bag', color: 'pink cream caramel' },
  MOM: { icons: 'a coffee cup, a heart, a sun, small flowers, a butterfly', color: 'pink purple teal' },
  REALTOR: { icons: 'a house, a set of keys, a sold sign, a door, a heart', color: 'teal navy gold' },
  LIBRARIAN: { icons: 'stacked books, an open book, reading glasses, a bookmark, a coffee cup', color: 'teal mustard purple' },
  CNA: { icons: 'a stethoscope, a blood pressure cuff, a clipboard, a heart, an EKG line', color: 'pink purple teal' },
  PARAMEDIC: { icons: 'a star of life symbol, an ambulance, a heart with heartbeat, a medical bag, a stethoscope', color: 'red blue teal' },
  PHARMACIST: { icons: 'a mortar and pestle, pill bottles, colorful pills, a prescription paper, a medical cross', color: 'purple blue green' },
  DENTAL_HYGIENIST: { icons: 'a tooth, a toothbrush, a dental mirror, floss, a sparkle', color: 'teal mint purple' },
  NANNY: { icons: 'a teddy bear, a baby bottle, building blocks, a heart, a star', color: 'pastel pink mint yellow' },
  SOCIAL_WORKER: { icons: 'two hands holding a heart, a globe, a puzzle piece, a sun, a heart', color: 'teal purple orange' },
  ESTHETICIAN: { icons: 'a face roller, skincare bottles, a flower, a sparkle, cotton pads', color: 'blush pink rose gold' },
  NAIL_TECH: { icons: 'a nail polish bottle, a manicured hand, a nail file, sparkles, a flower', color: 'hot pink purple gold' },
  BOSS_LADY: { icons: 'high heels, a lipstick, a crown, a coffee cup, a diamond', color: 'hot pink black gold' },
};

const ARTISTIC_WOMAN_EMOTIONS = [
  { emotion: 'serene calm', face: 'eyes closed in serene calm', flower: 'daisies', color: 'peach and cream' },
  { emotion: 'graceful confident', face: 'in profile with quiet confident intensity', flower: 'butterflies and daisies', color: 'dusty rose' },
  { emotion: 'strong powerful', face: 'with a powerful calm gaze', flower: 'botanical leaves and golden florals', color: 'sage green and gold' },
  { emotion: 'pensive melancholic', face: 'with a wistful melancholic gaze', flower: 'fading roses', color: 'grey lavender and mauve' },
  { emotion: 'passionate vibrant', face: 'full of emotion', flower: 'wildflowers bursting into abstract color', color: 'coral fuchsia and warm tones' },
  { emotion: 'spiritual ethereal', face: 'in meditative transcendence', flower: 'flowers and stars', color: 'midnight blue and gold' },
];

const PRAYING_POSES = [
  { pose: 'hands clasped in prayer and eyes gently closed in peaceful devotion', flower: 'soft flowers and rays of golden light', color: 'warm gold and cream' },
  { pose: 'hands pressed to her heart in grateful prayer, face lifted with a serene thankful expression', flower: 'delicate flowers and soft light', color: 'warm coral and gold' },
  { pose: 'open hands raised upward in surrender and worship, face turned up with eyes closed in faith', flower: 'doves and light rays', color: 'sky blue and gold' },
  { pose: 'quiet contemplative prayer with hands resting near her chin and a peaceful reflective expression', flower: 'soft flowers and gentle light', color: 'calm lavender and gold' },
  { pose: 'hands clasped firmly in prayer and head held high with strong faith and dignity', flower: 'bold flowers and radiant light', color: 'deep crimson and gold' },
  { pose: 'in profile with hands clasped in prayer and a transcendent peaceful expression', flower: 'flowers and stars', color: 'midnight blue and gold' },
];

const BIRTHDAY_POSES = [
  'holding a beautifully decorated birthday cake with lit candles',
  'joyfully popping a champagne bottle with bubbles flying',
  'elegantly holding up a glass of champagne in a toast',
  'seen from behind looking back over her shoulder, wearing a chic backless party dress',
  'in an elegant side profile pose holding a cocktail',
  'sitting gracefully on top of a table with crossed legs',
  'sitting playfully inside a giant oversized champagne coupe glass',
  'holding a bunch of elegant balloons floating above her',
  'celebrating with golden confetti raining down around her',
  'happily holding a stack of beautifully wrapped gift boxes',
];

// === LINE ART KONU HAVUZLARI ===
const LINE_ART_SUBJECTS = [
  // Mystical Symbols
  'a single mystical floating eye surrounded by delicate moths and a crescent moon',
  'an open hand holding a tiny crescent moon with botanical sprigs around it',
  'a coiled serpent intertwined with blooming wildflowers',
  'a butterfly with delicate botanical wings and tiny stars',
  'an ornate vintage key wrapped in ivy and tiny flowers',
  'a tarot card style frame with sun moon and stars inside',
  // Whimsical Creatures
  'a tiny peeking cat hiding behind a tall wildflower',
  'a sleepy owl perched on a thin branch with hanging leaves',
  'a small curled fox surrounded by tiny mushrooms',
  'a friendly dragon with a flower in its mouth',
  'a gentle mermaid floating with seaweed and small fish',
  'a quiet fairy sitting on a mushroom holding a tiny lantern',
  'a whimsical highland cow with tiny horns standing in tall wildflowers',
  // Botanical Fantasy
  'a woman\'s profile with blooming flowers growing out of her hair',
  'a hand emerging from soil with ivy wrapping around the fingers',
  'a tiny mushroom house with a winding path and floating leaves',
  'a vase overflowing with abstract wildflowers and one peeking eye',
  'a deer with antlers sprouting blooming branches and tiny birds',
  'a moon cradling a small flower bouquet with falling petals',
];

const ACCENT_COLORS = [
  'soft muted gold',
  'dusty terracotta red',
  'pale blush pink',
  'sage green',
];

const VIRAL_WESTERN_COMBOS = [
  { animal: 'goat', expression: 'sassy confident', word: 'WILD' },
  { animal: 'highland cow', expression: 'silly cheerful', word: 'HOWDY', extra: 'and tiny horns' },
  { animal: 'goat', expression: 'dramatic sassy', word: 'SASSY' },
  { animal: 'raccoon', expression: 'wild crazy', word: 'FERAL' },
  { animal: 'horse', expression: 'joyful goofy', word: 'YEEHAW' },
  { animal: 'goat', expression: 'playful unhinged', word: 'UNHINGED' },
  { animal: 'highland cow', expression: 'sweet tired', word: 'MAMA', extra: 'and tiny horns' },
  { animal: 'flamingo', expression: 'sassy bratty', word: 'SALTY' },
  { animal: 'goat', expression: 'sweet grateful', word: 'BLESSED' },
  { animal: 'highland cow', expression: 'bold confident', word: 'RODEO', extra: 'and tiny horns' },
];

const EPHEMERA_THEMES: Record<string, { items: string; color: string }> = {
  vintage: { items: 'aged labels, train tickets, postage stamps, small flowers, paper tags, butterflies, keys, botanical sketches', color: 'sepia and dusty' },
  botanical: { items: 'pressed flowers, leaves, seed packets, plant labels, botanical drawings, herb sprigs, garden tags', color: 'sage green and cream' },
  gothic: { items: 'moths, skeleton keys, dark labels, ravens, old letters, dried roses, apothecary tags', color: 'charcoal and deep purple' },
  floral: { items: 'roses, peonies, lace pieces, love letters, ribbons, floral tags, butterflies', color: 'blush pink and cream' },
  travel: { items: 'old maps, passport stamps, postcards, compass, tickets, luggage tags, world landmarks', color: 'tan and teal' },
  purple: { items: 'lavender sprigs, violet flowers, purple labels, butterflies, ornate tags, old letters', color: 'purple and mauve' },
};

const CUTOFF = 'fully contained within the frame with generous white margin, nothing cropped, centered, isolated on clean white background';
const CUTOFF_ARTISTIC = 'the entire artwork is small and fully centered on a large white canvas with wide empty margins on all sides, nothing touching or crossing the edges, complete uncropped composition';
const CUTOFF_LINE = 'the entire small artwork fully centered on a large white canvas with wide empty margins, nothing touching or crossing the edges, complete uncropped composition';

function buildQuirky(input: string): string[] {
  const animal = input.trim() || 'cat';
  const hornsAddon = animal.toLowerCase().includes('cow') ? ' and tiny horns' : '';
  return QUIRKY_POSES.map(pose =>
    'full body of a cute cartoon-style fluffy ' + animal + ' character with oversized glossy eyes' + hornsAddon + ', wearing a fur outfit and leather boots with daisies on the shoes, in a soft pink and sage color scheme, very detailed and textured, high resolution, full body shot, in the style of Pixar, ' + pose + ' while staring deadpan, ' + CUTOFF + ' --ar 1:1 --raw'
  );
}

function buildWordArt(input: string): string[] {
  const word = input.trim().toUpperCase() || 'NURSE';
  const data = WORDART_PROFESSIONS[word.replace(/ /g, '_')] || { icons: 'thematic icons related to the profession', color: 'vibrant pink teal gold' };
  return [
    'the word "' + word + '" in large bold colorful block letters filled with sparkling rhinestones gems and glitter, with large detailed icons prominently integrated between and around the letters: ' + data.icons + ', decorated with watercolor flowers in the corners, vibrant ' + data.color + ' watercolor splash background, gold glitter accents and paint splatters, sublimation design, high resolution, centered composition, isolated on white background --ar 1:1 --raw'
  ];
}

function buildArtisticWoman(input: string): string[] {
  const customEmotion = input.trim();
  if (customEmotion) {
    return [
      'a small centered composition surrounded by lots of empty white space, full view of an expressive ' + customEmotion + ' fine art portrait of a woman\'s face, bold gestural ink brushstrokes mixed with loose dripping watercolor, flowers dissolving into abstract paint splashes, raw unblended color, emotional and painterly, artistic imperfection, visible energetic brushwork, gallery art style, contemporary mixed media, hand-painted not digital, ' + CUTOFF_ARTISTIC + ' --ar 1:1 --raw --s 150'
    ];
  }
  return ARTISTIC_WOMAN_EMOTIONS.map(e =>
    'a small centered composition surrounded by lots of empty white space, full view of an expressive ' + e.emotion + ' fine art portrait of a woman\'s face ' + e.face + ', bold gestural ink brushstrokes mixed with loose dripping watercolor, ' + e.flower + ' dissolving into abstract paint splashes, ' + e.color + ' with raw unblended color, emotional and painterly, artistic imperfection, visible energetic brushwork, gallery art style, contemporary mixed media, hand-painted not digital, ' + CUTOFF_ARTISTIC + ' --ar 1:1 --raw --s 150'
  );
}

function buildPraying(input: string): string[] {
  const subject = input.trim() || 'Black woman';
  return PRAYING_POSES.map(p =>
    'a small centered composition surrounded by lots of empty white space, full view of an expressive fine art portrait of a ' + subject + ' with ' + p.pose + ', bold gestural ink brushstrokes mixed with loose dripping watercolor, ' + p.flower + ' dissolving into abstract paint splashes, ' + p.color + ' with raw unblended color, deeply spiritual and emotional, artistic imperfection, visible energetic brushwork, gallery art style, contemporary mixed media, hand-painted not digital, ' + CUTOFF_ARTISTIC + ' --ar 1:1 --raw --s 150'
  );
}

function buildEphemera(input: string): string[] {
  const theme = input.trim().toLowerCase() || 'vintage';
  const data = EPHEMERA_THEMES[theme] || EPHEMERA_THEMES.vintage;
  return [
    'a ' + theme + ' ephemera collage sheet with 16 assorted small separate elements neatly arranged with gaps between them: ' + data.items + ', muted ' + data.color + ' tones, hand-painted watercolor and ink, naive vintage scrapbook style, aged paper texture, complete sheet fully visible with white margins around all edges, nothing cropped, isolated on clean white background --ar 1:1 --raw'
    ];
}

function buildBirthdayGirl(input: string): string[] {
  const style = input.trim() || 'stylish glamorous';
  return BIRTHDAY_POSES.map(p =>
    'an elegant fashion illustration of a ' + style + ' woman ' + p + ', wearing a chic party dress, watercolor and ink with soft loose brushstrokes, sophisticated muted palette with gold accents, delicate floral details, joyful celebratory mood, hand-painted not digital, a small centered composition with lots of empty white space, nothing cropped or touching edges, isolated on clean white background --ar 1:1 --raw'
  );
}

// === 3 LINE ART BUILDER ===

function buildLineArtBW(input: string): string[] {
  const custom = input.trim();
  if (custom) {
    return [
      'sketchy line art drawing of whimsical ' + custom + ', abstracted in fast gestural lines, tiny body in motion, pure black ink on white background, no color, single weight line, monochrome ink sketch, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)'
    ];
  }
  return LINE_ART_SUBJECTS.map(s =>
    'sketchy line art drawing of whimsical ' + s + ', abstracted in fast gestural lines, tiny body in motion, pure black ink on white background, no color, single weight line, monochrome ink sketch, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)'
  );
}

function buildLineArtAccent(input: string): string[] {
  const custom = input.trim();
  if (custom) {
    return ACCENT_COLORS.map(c =>
      'sketchy line art drawing of whimsical ' + custom + ', abstracted in fast gestural lines, tiny body in motion, black ink on white background with a single ' + c + ' accent only, mostly monochrome, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)'
    );
  }
  return LINE_ART_SUBJECTS.map((s, i) => {
    const c = ACCENT_COLORS[i % ACCENT_COLORS.length];
    return 'sketchy line art drawing of whimsical ' + s + ', abstracted in fast gestural lines, tiny body in motion, black ink on white background with a single ' + c + ' accent only, mostly monochrome, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)';
  });
}

function buildLineArtWash(input: string): string[] {
  const custom = input.trim();
  if (custom) {
    return [
      'sketchy watercolor line art drawing of whimsical ' + custom + ', abstracted in fast gestural lines, tiny body in motion, black ink on white background, soft dusty pastel watercolor wash bleeding behind the line work, ink and watercolor mixed media, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)'
    ];
  }
  return LINE_ART_SUBJECTS.map(s =>
    'sketchy watercolor line art drawing of whimsical ' + s + ', abstracted in fast gestural lines, tiny body in motion, black ink on white background, soft dusty pastel watercolor wash bleeding behind the line work, ink and watercolor mixed media, hand-drawn storybook feel, ' + CUTOFF_LINE + ' --ar 1:1 --s 250 (sketches)'
  );
}

function buildViralWestern(input: string): string[] {
  const customAnimal = input.trim();
  if (customAnimal) {
    return [
      'vibrant watercolor ' + customAnimal + ' portrait with oversized glossy expressive eyes and a sassy confident funny expression, wearing glitter pink heart sunglasses and chunky turquoise cowgirl jewelry, colorful checkerboard backdrop with neon sparkles, ultra saturated summer palette, bold hand-lettered word "WILD" underneath in trendy western brush typography, feminine boutique t-shirt design, centered composition, white background, viral Etsy sublimation style --ar 1:1 --raw'
    ];
  }
  return VIRAL_WESTERN_COMBOS.map(c => {
    const extra = c.extra ? ' ' + c.extra : '';
    return 'vibrant watercolor ' + c.animal + ' portrait with oversized glossy expressive eyes' + extra + ' and a ' + c.expression + ' funny expression, wearing glitter pink heart sunglasses and chunky turquoise cowgirl jewelry, colorful checkerboard backdrop with neon sparkles, ultra saturated summer palette, bold hand-lettered word "' + c.word + '" underneath in trendy western brush typography, feminine boutique t-shirt design, centered composition, white background, viral Etsy sublimation style --ar 1:1 --raw';
  });
}

const BUILDERS: Record<FormulaKey, (input: string) => string[]> = {
  quirky: buildQuirky,
  wordart: buildWordArt,
  artistic_woman: buildArtisticWoman,
  praying: buildPraying,
  ephemera: buildEphemera,
  birthday_girl: buildBirthdayGirl,
  line_art_bw: buildLineArtBW,
  line_art_accent: buildLineArtAccent,
  line_art_wash: buildLineArtWash,
  viral_western: buildViralWestern,
};

export default function PromptGeneratorPage() {
  const [formula, setFormula] = useState<FormulaKey>('quirky');
  const [input, setInput] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function generate() {
    const result = BUILDERS[formula](input);
    setPrompts(result);
    setCopiedIndex(null);
  }

  function copyOne(index: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  function copyAll() {
    const all = prompts.join('\n\n---\n\n');
    navigator.clipboard.writeText(all);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  const currentFormula = FORMULAS[formula];

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="text-eyebrow mb-3">Admin · MJ Prompt Generator</p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-balance">
            Prompt <em className="italic text-clay">factory.</em>
          </h1>
          <p className="text-ink/60 mt-3">Tarz seç, kısa konu gir, hazır prompt setini al.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-ink/5 mb-6">
          <label className="block text-sm font-medium text-ink mb-3">1. Tarz seç</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
            {(Object.keys(FORMULAS) as FormulaKey[]).map(key => {
              const f = FORMULAS[key];
              const isActive = formula === key;
              return (
                <button
                  key={key}
                  onClick={() => { setFormula(key); setPrompts([]); }}
                  className={'text-left rounded-2xl p-3 border transition-all ' + (isActive ? 'bg-clay text-cream border-clay' : 'bg-cream border-ink/10 hover:border-clay/40')}
                >
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-xs font-medium leading-tight">{f.name}</div>
                </button>
              );
            })}
          </div>

          <label className="block text-sm font-medium text-ink mb-3">
            2. Konu / değişken gir <span className="text-ink/40 font-normal">({currentFormula.description})</span>
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentFormula.placeholder}
            className="w-full bg-cream border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none focus:border-clay"
            onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
          />

          <button
            onClick={generate}
            className="mt-5 w-full bg-ink text-cream py-3 rounded-xl font-medium hover:bg-clay transition-colors"
          >
            Promptları üret →
          </button>
        </div>

        {prompts.length > 0 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-ink/5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl">
                {prompts.length} prompt hazır
              </h2>
              <button
                onClick={copyAll}
                className="text-sm bg-cream border border-ink/10 px-4 py-2 rounded-lg hover:border-clay"
              >
                {copiedIndex === -1 ? 'Kopyalandı!' : 'Hepsini kopyala'}
              </button>
            </div>

            <div className="space-y-3">
              {prompts.map((p, i) => (
                <div key={i} className="bg-cream rounded-xl p-4 border border-ink/5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-medium text-ink/40">#{i + 1}</span>
                    <button
                      onClick={() => copyOne(i, p)}
                      className="text-xs bg-white border border-ink/10 px-3 py-1 rounded-md hover:border-clay shrink-0"
                    >
                      {copiedIndex === i ? 'Kopyalandı!' : 'Kopyala'}
                    </button>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed break-words font-mono">
                    {p}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
