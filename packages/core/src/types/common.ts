export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
