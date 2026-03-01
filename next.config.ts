import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 430, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 80, 112, 128, 144, 160, 224, 256, 288, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gyxcdrcdnnzjdmcrwbpr.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
