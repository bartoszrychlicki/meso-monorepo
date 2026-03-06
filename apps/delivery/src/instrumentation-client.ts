import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://593e0cec6129d93b12319769b09a25f9@o4510996462632960.ingest.de.sentry.io/4510996464533584",

  // Performance: 100% in dev, 10% in prod
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
