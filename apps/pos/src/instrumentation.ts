import * as Sentry from '@sentry/nextjs';

const sentryEnabled = process.env.E2E_DISABLE_SENTRY !== '1';

export async function register() {
  if (!sentryEnabled) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = sentryEnabled
  ? Sentry.captureRequestError
  : (..._args: Parameters<typeof Sentry.captureRequestError>) => {};
