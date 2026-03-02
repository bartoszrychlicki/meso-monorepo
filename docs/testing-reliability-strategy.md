# Testing & Reliability Strategy (Go-Live)

This document defines the release gate for both applications in this monorepo:
- Delivery (`apps/delivery`)
- POS (`apps/pos`)

Target: predictable deployments and fast rollback decisions during go-live week.

## 1) Critical User Journeys (must stay green)

1. Delivery checkout (cart -> checkout -> order confirmation).
2. Online payment flow (P24 sandbox in dedicated workflow).
3. Cross-app order lifecycle (Delivery -> POS/KDS -> status sync).
4. POS kitchen transitions (`new` -> `preparing` -> `ready`) and API transition integrity.

If any of the above fails, release is blocked.

## 2) Test Layers

1. Unit/integration (Vitest)
- Scope: business logic, API handlers, state transitions, shared packages.
- Command: `pnpm test`

2. Cross-app browser smoke (Playwright)
- Scope: fastest end-to-end path through Delivery + POS/KDS.
- Command: `cd apps/delivery && pnpm test:e2e:smoke`

3. Cross-app browser regression (Playwright)
- Scope: broader suite for checkout/order/payment mocks + status propagation.
- Command: `cd apps/delivery && pnpm test:e2e:regression`

4. Production-like sandbox (Playwright + real P24 sandbox)
- Scope: real payment redirect and confirmation + POS/KDS handling.
- Command: `cd apps/delivery && pnpm test:e2e:sandbox`

### Quarantined E2E tests

`apps/delivery/tests/order-placement-e2e.spec.ts` is currently kept for manual/debug runs, but excluded from CI regression gate due intermittent `order_items` persistence timing in DB assertions. Re-enable in CI after root cause fix.

## 3) GitHub Actions Workflows

1. `CI PR` (`.github/workflows/ci-pr.yml`)
- Trigger: pull requests to `main`.
- Jobs:
  - `quality` (build, lint, type-check, unit/integration tests)
  - `e2e-smoke` (cross-app smoke)
- This is the merge gate.

2. `CI Main` (`.github/workflows/ci-main.yml`)
- Trigger: push to `main`.
- Jobs:
  - `quality`
  - `e2e-regression`
- This is post-merge regression confidence.

3. `E2E Sandbox` (`.github/workflows/e2e-sandbox.yml`)
- Trigger: nightly schedule + manual dispatch.
- Job:
  - `sandbox-cross-app` (Delivery -> P24 sandbox -> POS KDS)

4. `Release Gate` (`.github/workflows/release-gate.yml`)
- Trigger: manual dispatch before release.
- Jobs:
  - `quality`
  - `e2e-smoke`
  - optional `e2e-sandbox`

All Playwright workflows upload `apps/delivery/test-results/` artifacts.

## 4) Branch Protection (manual GitHub setup)

For `main`, enable required status checks:
1. `CI PR / quality`
2. `CI PR / e2e-smoke`

Recommended additional settings:
1. Require pull request reviews (minimum 1).
2. Dismiss stale approvals on new commits.
3. Require branches to be up to date before merging.
4. Include administrators.

## 5) Go/No-Go Checklist (release day)

1. `CI PR` green for latest release PR.
2. `CI Main` green for commit being released.
3. `Release Gate` green on target ref (`run_sandbox=true`).
4. No unresolved P0/P1 bugs in checkout, payment, KDS transitions.
5. Rollback target identified and verified.

No-Go conditions:
1. Any critical user journey failing.
2. Reproducible 5xx in checkout or order transition APIs.
3. POS/KDS status not propagating back to Delivery.

## 6) Reliability Rules During Go-Live Week

1. Freeze non-critical feature work.
2. Merge only bugfixes with linked failing test or reproducible bug ticket.
3. Keep failed Playwright artifacts for triage (minimum 7 days).
4. Every production incident should produce one regression test.

## 7) Secrets & Variables used by CI

Required GitHub secrets:
1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `POS_API_KEY`
4. `E2E_GATE_PASSWORD` (for sandbox/release-gate live-like runs)

Public config currently hardcoded in workflows:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If needed, migrate these to repository variables later.
