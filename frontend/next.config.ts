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
};

export default nextConfig;
