import { createPosApiClient, type PosApiClient } from '@meso/api-client';

// Lazy singleton — avoids crashing during Next.js build when env vars aren't set
let _client: PosApiClient | null = null;

export function getPosApi(): PosApiClient {
  if (!_client) {
    const baseUrl = process.env.POS_API_URL?.trim();
    const apiKey = process.env.POS_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      const missingVars = [
        !baseUrl ? 'POS_API_URL' : null,
        !apiKey ? 'POS_API_KEY' : null,
      ].filter(Boolean).join(', ');

      throw new Error(`Missing required environment variables: ${missingVars}`);
    }

    _client = createPosApiClient({
      baseUrl,
      apiKey,
    });
  }
  return _client;
}
