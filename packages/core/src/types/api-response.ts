export interface ApiResponseMeta {
  total?: number;
  page?: number;
  per_page?: number;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: ApiResponseMeta;
  error?: ApiError;
}
