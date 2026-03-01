import { NextResponse } from 'next/server'

/**
 * POST /api/auth/upgrade-customer
 *
 * DEPRECATED: This endpoint was used for anonymous → permanent user upgrades.
 * With the new registration flow (signUp with app_role: 'customer'), the
 * handle_new_delivery_customer() trigger on auth.users automatically creates
 * the crm_customers record with registration bonus.
 *
 * Kept as a no-op to avoid 404s from any remaining client calls.
 */
export async function POST() {
  return NextResponse.json({ ok: true, message: 'Handled by database trigger' })
}
