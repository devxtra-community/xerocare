import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev',
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
    ];
  },
};

export default nextConfig;
