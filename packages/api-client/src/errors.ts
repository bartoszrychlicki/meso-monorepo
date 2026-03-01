import type { ApiError as ApiErrorType } from '@meso/core';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown[];

  constructor(error: ApiErrorType, status: number = 400) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
