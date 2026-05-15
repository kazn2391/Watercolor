# Watercolor Clipart v2

Pinterest masonry tasarımıyla, SuzyFlowArt Etsy mağazasının resmi sitesi.

## Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL)
- Tailwind CSS
- Vercel hosting

## Environment variables (Vercel'de tanımla)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ETSY_API_KEY=keystring
ETSY_SHARED_SECRET=shared-secret
ETSY_SHOP_ID=49999102
CRON_SECRET=random-long-string
NEXT_PUBLIC_SITE_URL=https://www.watercolorclipart.org
NEXT_PUBLIC_ETSY_SHOP_URL=https://www.etsy.com/shop/SuzyFlowArt
```

## Sync tetikleme

```bash
curl -X POST https://www.watercolorclipart.org/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Vercel cron her 6 saatte bir otomatik sync yapar (vercel.json).
