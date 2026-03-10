import type { PosbistroCartPayload, PosbistroSubmitResponse } from './types';

export class PosbistroSubmitError extends Error {
  status?: number;
  responseBody?: unknown;

  constructor(message: string, options?: { status?: number; responseBody?: unknown }) {
    super(message);
    this.name = 'PosbistroSubmitError';
    this.status = options?.status;
    this.responseBody = options?.responseBody;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export class PosbistroClient {
  constructor(
    private readonly config: {
      baseUrl: string;
      apiKey: string;
      fetchImpl?: typeof fetch;
    }
  ) {}

  async submitOrder(payload: PosbistroCartPayload): Promise<PosbistroSubmitResponse> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url =
      `${baseUrl}/api/delivery/carts?api_key=${encodeURIComponent(this.config.apiKey)}`;

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new PosbistroSubmitError('POSBistro order submit failed', {
        status: response.status,
        responseBody,
      });
    }

    return (responseBody ?? {}) as PosbistroSubmitResponse;
  }
}

export function createPosbistroClient(config?: {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): PosbistroClient {
  const baseUrl = config?.baseUrl?.trim() || process.env.POSBISTRO_BASE_URL?.trim() || 'https://api.posbistro.com';
  const apiKey = config?.apiKey?.trim() || process.env.POSBISTRO_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Missing required environment variable: POSBISTRO_API_KEY');
  }

  return new PosbistroClient({
    baseUrl,
    apiKey,
    fetchImpl: config?.fetchImpl,
  });
}
