export function inferCategoriesFromTags(tags: string[], title: string): string[] {
  const slugs = new Set<string>();
  const text = (title + ' ' + tags.join(' ')).toLowerCase();

  if (/\bcat\b|kitten|feline/.test(text)) slugs.add('watercolor-cat-clipart');
  if (/woman|women|female|lady|girl|portrait/.test(text)) slugs.add('woman-art');
  if (/peek|peeking/.test(text)) slugs.add('peeking-art');
  if (/quirky|whimsical|funny/.test(text)) slugs.add('quirky-whimsical');
  if (/birthday|celebration|party/.test(text)) slugs.add('birthday-celebration');
  if (/christmas|halloween|santa|pumpkin/.test(text)) slugs.add('christmas-halloween');
  if (/easter|valentine|love|heart/.test(text)) slugs.add('easter-valentine');
  if (/mystic|celestial|moon|goddess|spiritual|astrology/.test(text)) slugs.add('mystic-religious');
  if (/nursery|baby|child|kid/.test(text)) slugs.add('nursery-art');
  if (/journal|ephemera|scrapbook|sticker/.test(text)) slugs.add('junk-journal-sticker');
  if (/sublimation|png|t-shirt|tshirt/.test(text)) slugs.add('sublimation');
  if (/bundle|whole shop|mega/.test(text)) slugs.add('shop-bundles');

  if (slugs.size === 0) slugs.add('cliparts');
  return Array.from(slugs);
}
