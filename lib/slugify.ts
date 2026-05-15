import slugify from 'slugify';

export function makeSlug(title: string, id?: number | string): string {
  const base = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  }).slice(0, 80);
  if (id) return `${base}-${id}`;
  return base;
}
