import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

export type Listing = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  original_price: number | null;
  currency_code: string;
  on_sale: boolean;
  discount_percent: number | null;
  etsy_url: string;
  state: string;
  main_image_url: string | null;
  images: Array<{ url: string; url_full?: string; url_small?: string; alt?: string }>;
  tags: string[];
  views: number;
  num_favorers: number;
  is_digital: boolean;
  etsy_created_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  listing_count: number;
  display_order: number;
  hero_image_url: string | null;
};
