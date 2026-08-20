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
    ],
  },
  async rewrites() {
    return [
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
