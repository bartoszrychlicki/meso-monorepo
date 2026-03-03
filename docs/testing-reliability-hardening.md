# Testing Plan: Reliability Hardening (POS↔API)

## Scope
- Status contract compatibility between POS and Delivery UI.
- Idempotent create/status update paths for integration callbacks.
- Transactional consistency between `orders_orders.items` and `orders_order_items`.

## Automated Test Order
1. `pnpm --filter @meso/core test`
2. `pnpm --filter @meso/api-client test`
3. `pnpm --filter mesopos test`
4. `pnpm --filter meso-app test`
5. `pnpm --filter meso-app test:e2e -- --grep "cross-app|p24|lifecycle|status-contract"`
6. `pnpm type-check`

## Critical Assertions
- Delivery UI must not crash for unknown/legacy order status values.
- `POST /api/v1/orders` must return the same order for duplicate `external_order_id`.
- Repeated `PATCH /api/v1/orders/:id/status` with same status must return `200`.
- Updating items via `PUT /api/v1/orders/:id` must keep JSON and relational rows consistent.
- Duplicate P24 callback notifications must return `200` and avoid unstable state transitions.

## Migration Verification (remote-only Supabase)
1. `npx supabase link --project-ref gyxcdrcdnnzjdmcrwbpr`
2. `npx supabase migration list`
3. `npx supabase db push`

## Manual Smoke Checks
1. Create a delivery order with unpaid payment and verify "Oczekujemy na płatność".
2. Transition status in POS to `accepted` then `out_for_delivery`; confirm live update in delivery order details.
3. Re-send the same payment callback payload and confirm no 422/500 response.
