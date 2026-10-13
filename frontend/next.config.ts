import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      'tailwind-merge': 'tailwind-merge/dist/bundle-cjs.js',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Any R2 public bucket URL — pinning one bucket's hostname here broke
      // every image the moment the bucket was swapped.
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Pre-signed links are served straight off the S3 API endpoint
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  async rewrites() {
    return [
      // Keep customer URLs short enough for WhatsApp's link detector while
      // transparently serving the existing signing pages.
      {
        source: '/s/c/:token',
        destination: '/public/contract/sign/:token',
      },
      {
        source: '/s/b/:token',
        destination: '/public/bill/sign/:token',
      },
      {
        source: '/s/q/:id',
        destination: 'http://localhost:3001/b/invoices/:id/respond',
      },
      {
        source: '/s/p/:id',
        destination: 'http://localhost:3001/b/public/payment-receipt/:id',
      },
      {
        source: '/e/:path*',
        destination: 'http://localhost:3001/e/:path*',
      },
      {
        source: '/i/:path*',
        destination: 'http://localhost:3001/i/:path*',
      },
      {
        source: '/b/:path*',
        destination: 'http://localhost:3001/b/:path*',
      },
      {
        source: '/c/:path*',
        destination: 'http://localhost:3001/c/:path*',
      },
      {
        source: '/health/:path*',
        destination: 'http://localhost:3001/health/:path*',
      },
      {
        source: '/bank-reference/:path*',
        destination: 'http://localhost:3001/bank-reference/:path*',
      },
    ];
  },
};

export default nextConfig;
