import { createPosApiClient, type PosApiClient } from '@meso/api-client';

// Lazy singleton — avoids crashing during Next.js build when env vars aren't set
let _client: PosApiClient | null = null;

export function getPosApi(): PosApiClient {
  if (!_client) {
    _client = createPosApiClient({
      baseUrl: process.env.POS_API_URL!,
      apiKey: process.env.POS_API_KEY!,
    });
  }
  return _client;
}
