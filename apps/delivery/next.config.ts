import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@meso/core", "@meso/api-client", "@meso/supabase"],
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

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Proxy to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Silence source map upload logs
  silent: !process.env.CI,

  // Disable Telemetry
  telemetry: false,
});
