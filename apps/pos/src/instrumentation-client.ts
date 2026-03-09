import * as Sentry from '@sentry/nextjs';

const sentryEnabled =
  process.env.NODE_ENV !== 'test' &&
  process.env.NEXT_PUBLIC_E2E_DISABLE_SENTRY !== '1';

if (sentryEnabled) {
  Sentry.init({
    dsn: 'https://1e4074d6db8a55a66a428c7726d52fba@o4510996462632960.ingest.de.sentry.io/4511002428637264',
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
    enabled: true,
    initialScope: {
      tags: {
        app: 'pos',
      },
    },
    debug: false,
  });
}

export const onRouterTransitionStart = sentryEnabled
  ? Sentry.captureRouterTransitionStart
  : () => {};
