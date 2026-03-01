import type { ApiResponse } from '@meso/core';
import { ApiError, NetworkError } from './errors';

export interface MesoClientConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  onError?: (error: ApiError | NetworkError) => void;
}

export class MesoClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;
  private timeoutMs: number;
  private onError?: (error: ApiError | NetworkError) => void;

  constructor(config: MesoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 2;
    this.timeoutMs = config.timeoutMs ?? 8000;
    this.onError = config.onError;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | NetworkError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const json: ApiResponse<T> = await res.json();

        if (!json.success && json.error) {
          const apiError = new ApiError(json.error, res.status);
          // Don't retry client errors (4xx)
          if (res.status < 500) {
            this.onError?.(apiError);
            throw apiError;
          }
          // Retry server errors (5xx)
          lastError = apiError;
        } else {
          return json;
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        lastError = new NetworkError(
          err instanceof Error ? err.message : 'Network error'
        );
      }

      // Backoff before retry
      if (attempt < this.maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    this.onError?.(lastError!);
    throw lastError!;
  }
}
