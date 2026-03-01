import { MesoClient } from './client';
import type { MesoClientConfig } from './client';
import { OrdersApi } from './orders';
import { CustomersApi } from './customers';

export { MesoClient } from './client';
export type { MesoClientConfig } from './client';
export { OrdersApi } from './orders';
export { CustomersApi } from './customers';
export { ApiError, NetworkError } from './errors';

export class PosApiClient {
  public readonly orders: OrdersApi;
  public readonly customers: CustomersApi;
  private client: MesoClient;

  constructor(config: MesoClientConfig) {
    this.client = new MesoClient(config);
    this.orders = new OrdersApi(this.client);
    this.customers = new CustomersApi(this.client);
  }
}

export function createPosApiClient(config: MesoClientConfig): PosApiClient {
  return new PosApiClient(config);
}
