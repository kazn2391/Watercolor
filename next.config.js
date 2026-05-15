/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.etsystatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.etsystatic.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
