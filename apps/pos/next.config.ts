import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const isLocalPlaywrightE2E = process.env.E2E_DISABLE_SENTRY === '1';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: ['@meso/core', '@meso/api-client', '@meso/supabase'],
};

export default isLocalPlaywrightE2E
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      tunnelRoute: '/monitoring',
      silent: !process.env.CI,
      telemetry: false,
    });
