# MESO Club Loyalty Program — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a coupon-based loyalty program where customers earn points and exchange them for single-use discount coupons.

**Architecture:** Loyalty coupons are a separate table (`loyalty_coupons`) but share a single discount slot in the cart with promo codes. Points earning happens via Supabase triggers on order delivery. Referral system uses phone number lookup with a welcome coupon for new users.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + triggers), Zustand (cart state)

**Design Document:** `docs/plans/2026-02-25-loyalty-program-design.md`

---

## Phase 1: Database Foundation

### Task 1: Create migration for loyalty coupons and schema changes

**Files:**
- Create: `supabase/migrations/20260225_loyalty_coupons.sql`

**Step 1: Write the migration SQL**

Create the file with this content:

```sql
-- =============================================
-- LOYALTY COUPONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS loyalty_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  coupon_type VARCHAR(20) NOT NULL CHECK (coupon_type IN ('free_delivery', 'discount', 'free_product')),
  discount_value DECIMAL(10,2),
  free_product_name VARCHAR(255),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  points_spent INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL DEFAULT 'reward' CHECK (source IN ('reward', 'referral_welcome')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_coupons_customer ON loyalty_coupons(customer_id, status);
CREATE INDEX idx_loyalty_coupons_code ON loyalty_coupons(code);
CREATE INDEX idx_loyalty_coupons_expires ON loyalty_coupons(expires_at) WHERE status = 'active';

-- RLS
ALTER TABLE loyalty_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons"
  ON loyalty_coupons FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Service role full access to coupons"
  ON loyalty_coupons FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ADD lifetime_points TO customers
-- =============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points INTEGER NOT NULL DEFAULT 0;

-- Backfill lifetime_points from current loyalty_points
UPDATE customers SET lifetime_points = loyalty_points WHERE lifetime_points = 0 AND loyalty_points > 0;

-- =============================================
-- ADD min_tier TO loyalty_rewards
-- =============================================

ALTER TABLE loyalty_rewards ADD COLUMN IF NOT EXISTS min_tier VARCHAR(20) NOT NULL DEFAULT 'bronze'
  CHECK (min_tier IN ('bronze', 'silver', 'gold'));

-- =============================================
-- UPDATE handle_order_delivered TRIGGER
-- Adds: lifetime_points, first order bonus, referral bonus, tier upgrade
-- =============================================

CREATE OR REPLACE FUNCTION handle_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_customer RECORD;
  v_earned INTEGER;
  v_is_first_order BOOLEAN;
  v_referrer_id UUID;
  v_order_count INTEGER;
  v_thresholds JSONB;
  v_new_tier VARCHAR(20);
BEGIN
  -- Only fire when status changes to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

    -- Set delivered_at timestamp
    NEW.delivered_at := now();

    -- Get customer data
    SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
    v_earned := COALESCE(NEW.loyalty_points_earned, 0);

    -- Check if first delivered order
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE customer_id = NEW.customer_id
      AND status = 'delivered'
      AND id != NEW.id;
    v_is_first_order := (v_order_count = 0);

    -- Add earned points to loyalty_points and lifetime_points
    UPDATE customers
    SET loyalty_points = loyalty_points + v_earned,
        lifetime_points = lifetime_points + v_earned
    WHERE id = NEW.customer_id;

    -- Log earned points
    INSERT INTO loyalty_history (customer_id, label, points, type, order_id)
    VALUES (NEW.customer_id, 'Zamowienie #' || NEW.id, v_earned, 'earned', NEW.id);

    -- First order bonus: +50
    IF v_is_first_order THEN
      UPDATE customers
      SET loyalty_points = loyalty_points + 50,
          lifetime_points = lifetime_points + 50
      WHERE id = NEW.customer_id;

      INSERT INTO loyalty_history (customer_id, label, points, type, order_id)
      VALUES (NEW.customer_id, 'Bonus za pierwsze zamowienie', 50, 'bonus', NEW.id);
    END IF;

    -- Referral bonus: +100 for referrer on referred user's first order
    IF v_is_first_order AND v_customer.referred_by IS NOT NULL THEN
      v_referrer_id := v_customer.referred_by;

      UPDATE customers
      SET loyalty_points = loyalty_points + 100,
          lifetime_points = lifetime_points + 100
      WHERE id = v_referrer_id;

      INSERT INTO loyalty_history (customer_id, label, points, type)
      VALUES (v_referrer_id, 'Polecenie: ' || COALESCE(v_customer.name, v_customer.email), 100, 'bonus');
    END IF;

    -- Tier upgrade check
    SELECT value INTO v_thresholds FROM app_config WHERE key = 'loyalty_tier_thresholds';
    IF v_thresholds IS NOT NULL THEN
      SELECT lifetime_points INTO v_earned FROM customers WHERE id = NEW.customer_id;

      IF v_earned >= COALESCE((v_thresholds->>'gold')::int, 1500) THEN
        v_new_tier := 'gold';
      ELSIF v_earned >= COALESCE((v_thresholds->>'silver')::int, 500) THEN
        v_new_tier := 'silver';
      ELSE
        v_new_tier := 'bronze';
      END IF;

      -- Only upgrade, never downgrade
      UPDATE customers
      SET loyalty_tier = v_new_tier
      WHERE id = NEW.customer_id
        AND (
          (loyalty_tier = 'bronze' AND v_new_tier IN ('silver', 'gold'))
          OR (loyalty_tier = 'silver' AND v_new_tier = 'gold')
        );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE handle_new_user TRIGGER
-- Adds: log registration bonus to loyalty_history, set lifetime_points
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  INSERT INTO customers (id, email, name, loyalty_points, lifetime_points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    50,
    50
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_customer_id;

  -- Log registration bonus
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO loyalty_history (customer_id, label, points, type)
    VALUES (v_customer_id, 'Bonus rejestracyjny', 50, 'bonus');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Push migration to remote Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify in Supabase dashboard**

Check that `loyalty_coupons` table exists, `lifetime_points` column added to customers, `min_tier` column added to loyalty_rewards.

**Step 4: Commit**

```bash
git add supabase/migrations/20260225_loyalty_coupons.sql
git commit -m "feat: add loyalty_coupons table, lifetime_points, min_tier, updated triggers"
```

---

## Phase 2: Backend APIs

### Task 2: Create API endpoint — Activate Coupon

**Files:**
- Create: `src/app/api/loyalty/activate-coupon/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

function generateCouponCode(): string {
  return 'MESO-' + nanoid(5).toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Musisz byc zalogowany' }, { status: 401 })
    }

    const { reward_id } = await request.json()
    if (!reward_id) {
      return NextResponse.json({ error: 'Brak reward_id' }, { status: 400 })
    }

    // Use service role client for writes
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check for existing active coupon
    const { data: activeCoupon } = await serviceClient
      .from('loyalty_coupons')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (activeCoupon) {
      return NextResponse.json(
        { error: 'Masz juz aktywny kupon. Uzyj go lub poczekaj az wygasnie.' },
        { status: 409 }
      )
    }

    // Fetch reward
    const { data: reward, error: rewardError } = await serviceClient
      .from('loyalty_rewards')
      .select('*')
      .eq('id', reward_id)
      .eq('is_active', true)
      .single()

    if (rewardError || !reward) {
      return NextResponse.json({ error: 'Nagroda nie istnieje' }, { status: 404 })
    }

    // Fetch customer
    const { data: customer, error: customerError } = await serviceClient
      .from('customers')
      .select('loyalty_points, loyalty_tier')
      .eq('id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Nie znaleziono klienta' }, { status: 404 })
    }

    // Check points
    if (customer.loyalty_points < reward.points_cost) {
      return NextResponse.json(
        { error: `Potrzebujesz ${reward.points_cost} pkt, masz ${customer.loyalty_points}` },
        { status: 400 }
      )
    }

    // Check tier
    const tierOrder = ['bronze', 'silver', 'gold']
    const customerTierIdx = tierOrder.indexOf(customer.loyalty_tier || 'bronze')
    const requiredTierIdx = tierOrder.indexOf(reward.min_tier || 'bronze')

    if (customerTierIdx < requiredTierIdx) {
      return NextResponse.json(
        { error: `Ta nagroda wymaga poziomu ${reward.min_tier}` },
        { status: 403 }
      )
    }

    // Generate unique coupon code
    let code = generateCouponCode()
    let codeExists = true
    let attempts = 0
    while (codeExists && attempts < 5) {
      const { data } = await serviceClient
        .from('loyalty_coupons')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      codeExists = !!data
      if (codeExists) code = generateCouponCode()
      attempts++
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Deduct points
    const { error: pointsError } = await serviceClient
      .from('customers')
      .update({ loyalty_points: customer.loyalty_points - reward.points_cost })
      .eq('id', user.id)

    if (pointsError) {
      return NextResponse.json({ error: 'Blad przy odejmowaniu punktow' }, { status: 500 })
    }

    // Create coupon
    const { data: coupon, error: couponError } = await serviceClient
      .from('loyalty_coupons')
      .insert({
        customer_id: user.id,
        reward_id: reward.id,
        code,
        coupon_type: reward.reward_type,
        discount_value: reward.discount_value,
        free_product_name: reward.reward_type === 'free_product' ? reward.name : null,
        status: 'active',
        points_spent: reward.points_cost,
        source: 'reward',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (couponError) {
      // Rollback points
      await serviceClient
        .from('customers')
        .update({ loyalty_points: customer.loyalty_points })
        .eq('id', user.id)
      return NextResponse.json({ error: 'Blad przy tworzeniu kuponu' }, { status: 500 })
    }

    // Log to loyalty_history
    await serviceClient
      .from('loyalty_history')
      .insert({
        customer_id: user.id,
        label: `Kupon: ${reward.name}`,
        points: -reward.points_cost,
        type: 'spent',
      })

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        code: coupon.code,
        coupon_type: coupon.coupon_type,
        discount_value: coupon.discount_value,
        free_product_name: coupon.free_product_name,
        expires_at: coupon.expires_at,
      }
    })

  } catch {
    return NextResponse.json({ error: 'Wystapil blad serwera' }, { status: 500 })
  }
}
```

**Step 2: Install nanoid**

Run: `npm install nanoid`

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add src/app/api/loyalty/activate-coupon/route.ts package.json package-lock.json
git commit -m "feat: add POST /api/loyalty/activate-coupon endpoint"
```

---

### Task 3: Create API endpoint — Get Active Coupon

**Files:**
- Create: `src/app/api/loyalty/active-coupon/route.ts`

**Step 1: Create the API route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ coupon: null })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, expire any stale coupons
    await serviceClient
      .from('loyalty_coupons')
      .update({ status: 'expired' })
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    // Fetch active coupon
    const { data: coupon } = await serviceClient
      .from('loyalty_coupons')
      .select('id, code, coupon_type, discount_value, free_product_name, expires_at, source')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    return NextResponse.json({ coupon: coupon || null })

  } catch {
    return NextResponse.json({ coupon: null })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/api/loyalty/active-coupon/route.ts
git commit -m "feat: add GET /api/loyalty/active-coupon endpoint"
```

---

### Task 4: Create API endpoint — Loyalty History

**Files:**
- Create: `src/app/api/loyalty/history/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = 20
    const offset = page * limit

    const { data: history, error, count } = await supabase
      .from('loyalty_history')
      .select('*', { count: 'exact' })
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Blad pobierania historii' }, { status: 500 })
    }

    return NextResponse.json({
      history: history || [],
      total: count || 0,
      page,
      hasMore: (count || 0) > offset + limit,
    })

  } catch {
    return NextResponse.json({ error: 'Wystapil blad serwera' }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/api/loyalty/history/route.ts
git commit -m "feat: add GET /api/loyalty/history endpoint with pagination"
```

---

### Task 5: Extend checkout to handle loyalty coupons

**Files:**
- Modify: `src/hooks/useCheckout.ts`
- Modify: `src/stores/cartStore.ts`

**Step 1: Add coupon fields to cart store**

In `src/stores/cartStore.ts`, add coupon state alongside existing promo code state:

Add to interface after `promoDiscountType`:
```typescript
// Loyalty coupon (shares slot with promo code)
loyaltyCoupon: {
  id: string
  code: string
  coupon_type: 'free_delivery' | 'discount' | 'free_product'
  discount_value: number | null
  free_product_name: string | null
  expires_at: string
} | null
```

Add to initial state: `loyaltyCoupon: null`

Add methods:
```typescript
setLoyaltyCoupon: (coupon) => set({
  loyaltyCoupon: coupon,
  // Clear promo code when coupon is set (one slot)
  promoCode: null,
  promoDiscount: 0,
  promoDiscountType: null,
}),
clearLoyaltyCoupon: () => set({ loyaltyCoupon: null }),
```

Modify `setPromoCode` to also clear coupon:
```typescript
setPromoCode: (code, discount, discountType) => set({
  promoCode: code,
  promoDiscount: discount,
  promoDiscountType: discountType,
  loyaltyCoupon: null, // Clear coupon when promo code is set
}),
```

Update `getDiscount` to include coupon discounts:
```typescript
getDiscount: () => {
  const state = get()
  // Promo code discount
  if (state.promoCode) {
    if (state.promoDiscountType === 'percent') {
      return state.getSubtotal() * (state.promoDiscount / 100)
    }
    if (state.promoDiscountType === 'fixed') {
      return state.promoDiscount
    }
  }
  // Loyalty coupon discount
  if (state.loyaltyCoupon) {
    if (state.loyaltyCoupon.coupon_type === 'discount') {
      return state.loyaltyCoupon.discount_value || 0
    }
  }
  return 0
},
```

Update `getDeliveryFee` to handle coupon free delivery:
```typescript
// Add to existing free delivery check:
if (state.promoDiscountType === 'free_delivery' || state.loyaltyCoupon?.coupon_type === 'free_delivery') {
  return 0
}
```

**Step 2: Update useCheckout to mark coupon as used**

In `src/hooks/useCheckout.ts`, after successful order creation, add coupon handling:

After the order is inserted and `orderId` is available, before payment processing:
```typescript
// Mark loyalty coupon as used
const loyaltyCoupon = useCartStore.getState().loyaltyCoupon
if (loyaltyCoupon) {
  await supabase
    .from('loyalty_coupons')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
      order_id: orderId,
    })
    .eq('id', loyaltyCoupon.id)
    .eq('customer_id', user.id)
}
```

Also set `promo_code` field in the order to the coupon code if a coupon is active:
```typescript
promo_code: promoCode || loyaltyCoupon?.code || null,
promo_discount: getDiscount(),
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add src/stores/cartStore.ts src/hooks/useCheckout.ts
git commit -m "feat: integrate loyalty coupons into cart store and checkout flow"
```

---

### Task 6: Update promo code validation to check coupon conflicts

**Files:**
- Modify: `src/components/cart/PromoCodeInput.tsx`

**Step 1: Check for active coupon before allowing promo code**

In the `handleApply` function, before calling the validate API:

```typescript
const loyaltyCoupon = useCartStore.getState().loyaltyCoupon
if (loyaltyCoupon) {
  toast.error('Masz aktywny kupon lojalnosciowy. Usun go, aby uzyc kodu promocyjnego.')
  return
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/components/cart/PromoCodeInput.tsx
git commit -m "feat: block promo code input when loyalty coupon is active"
```

---

## Phase 3: Frontend — Core Coupon Flow

### Task 7: Rewrite MESO Club page with real coupon activation

**Files:**
- Modify: `src/app/(main)/account/club/page.tsx`

**Step 1: Replace mock redemption with real API call**

Replace the `handleRedeemReward` function (currently lines 39-55) with:

```typescript
const [confirmReward, setConfirmReward] = useState<LoyaltyRewardRow | null>(null)

const handleActivateCoupon = async (reward: LoyaltyRewardRow) => {
  setRedeemingReward(reward.id)
  try {
    const res = await fetch('/api/loyalty/activate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: reward.id }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Nie udalo sie aktywowac kuponu')
      return
    }

    // Add coupon to cart
    useCartStore.getState().setLoyaltyCoupon(data.coupon)

    toast.success(`Aktywowano kupon: ${reward.name}`, {
      description: 'Kupon zostal dodany do koszyka. Wazny 24h.',
    })

    // Refresh points display
    refreshLoyalty()
    setConfirmReward(null)
  } catch {
    toast.error('Wystapil blad')
  } finally {
    setRedeemingReward(null)
  }
}
```

**Step 2: Add confirmation modal**

Before the reward "Aktywuj" button triggers the API, show a confirmation dialog:

```typescript
{confirmReward && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div className="w-full max-w-sm rounded-2xl bg-meso-dark-800 p-6 space-y-4">
      <h3 className="text-lg font-bold">Aktywujesz kupon</h3>
      <p className="text-sm text-white/70">{confirmReward.name}</p>
      <p className="text-sm">Koszt: <span className="font-bold text-meso-gold-400">{confirmReward.points_cost} pkt</span></p>
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
        <p className="text-xs text-red-400">Punkty nie podlegaja zwrotowi. Kupon wazny 24 godziny.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirmReward(null)}
          className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-medium"
        >
          Anuluj
        </button>
        <button
          onClick={() => handleActivateCoupon(confirmReward)}
          disabled={redeemingReward === confirmReward.id}
          className="flex-1 rounded-xl bg-meso-red-500 py-3 text-sm font-bold"
        >
          {redeemingReward === confirmReward.id ? 'Aktywowanie...' : 'Potwierdzam'}
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 3: Add tier gating to reward display**

For each reward in the list, check `reward.min_tier` against customer's tier:

```typescript
const tierOrder = ['bronze', 'silver', 'gold']
const customerTierIdx = tierOrder.indexOf(tier || 'bronze')
const rewardTierIdx = tierOrder.indexOf(reward.min_tier || 'bronze')
const tierLocked = customerTierIdx < rewardTierIdx
```

If `tierLocked`: show reward grayed out with badge "Od Silver" or "Od Gold", hide "Aktywuj" button.

**Step 4: Check for existing active coupon**

On page load, fetch `/api/loyalty/active-coupon`. If active coupon exists, disable all "Aktywuj" buttons and show info: "Masz aktywny kupon. Uzyj go lub poczekaj az wygasnie."

**Step 5: Remove hardcoded birthday/referral quick actions**

Remove the "Polec znajomemu" and "Urodziny" quick action buttons (lines 127-139). Replace with actual referral code display if customer has one.

**Step 6: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 7: Commit**

```bash
git add "src/app/(main)/account/club/page.tsx"
git commit -m "feat: real coupon activation on MESO Club page with confirmation modal and tier gating"
```

---

### Task 8: Add coupon display and suggestion in cart

**Files:**
- Modify: `src/components/cart/LoyaltyBox.tsx`
- Modify: `src/components/cart/PromoCodeInput.tsx`

**Step 1: Show active coupon in PromoCodeInput area**

When `loyaltyCoupon` is set in cart store, replace the promo code input with a coupon display:

```typescript
const loyaltyCoupon = useCartStore((s) => s.loyaltyCoupon)
const clearLoyaltyCoupon = useCartStore((s) => s.clearLoyaltyCoupon)

// If coupon is active, show it instead of promo code input
if (loyaltyCoupon) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-meso-gold-400/30 bg-meso-gold-400/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-meso-gold-400" />
        <div>
          <p className="text-sm font-medium text-meso-gold-400">Kupon: {loyaltyCoupon.code}</p>
          <p className="text-xs text-white/50">
            {loyaltyCoupon.coupon_type === 'free_delivery' && 'Darmowa dostawa'}
            {loyaltyCoupon.coupon_type === 'discount' && `Rabat ${loyaltyCoupon.discount_value} zl`}
            {loyaltyCoupon.coupon_type === 'free_product' && loyaltyCoupon.free_product_name}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          clearLoyaltyCoupon()
          toast('Kupon usuniety z koszyka. Punkty nie wracaja.')
        }}
        className="p-1 text-white/40 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

**Step 2: Add suggestion banner in LoyaltyBox**

When customer has enough points for any reward but no active coupon, show:

```typescript
{!activeCoupon && affordableReward && (
  <Link
    href="/account/club"
    className="flex items-center gap-2 rounded-xl bg-meso-gold-400/10 border border-meso-gold-400/20 px-4 py-3"
  >
    <Gift className="h-4 w-4 text-meso-gold-400" />
    <p className="text-xs text-meso-gold-400">
      Masz {points} pkt — aktywuj kupon!
    </p>
  </Link>
)}
```

Fetch active coupon status and check affordable rewards in LoyaltyBox using existing hooks.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add src/components/cart/LoyaltyBox.tsx src/components/cart/PromoCodeInput.tsx
git commit -m "feat: show loyalty coupon in cart and add activation suggestion"
```

---

### Task 9: Sync coupon state on cart load

**Files:**
- Modify: `src/app/(menu)/cart/page.tsx`

**Step 1: Add coupon sync effect**

On cart page mount, fetch active coupon from API and sync with Zustand:

```typescript
useEffect(() => {
  async function syncCoupon() {
    try {
      const res = await fetch('/api/loyalty/active-coupon')
      const { coupon } = await res.json()
      const storeCoupon = useCartStore.getState().loyaltyCoupon

      if (coupon && !storeCoupon) {
        // DB has active coupon but store doesn't — restore it
        useCartStore.getState().setLoyaltyCoupon(coupon)
      } else if (!coupon && storeCoupon) {
        // Store has coupon but it expired in DB — clear it
        useCartStore.getState().clearLoyaltyCoupon()
      }
    } catch {
      // Silently fail — non-critical
    }
  }
  syncCoupon()
}, [])
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add "src/app/(menu)/cart/page.tsx"
git commit -m "feat: sync loyalty coupon state between DB and cart on page load"
```

---

## Phase 4: Loyalty Improvements

### Task 10: Implement loyalty history page

**Files:**
- Modify: `src/app/(main)/loyalty/page.tsx`

**Step 1: Replace "coming soon" placeholder with real history**

In the Historia tab (currently lines 185-201), replace placeholder with:

```typescript
const [history, setHistory] = useState<LoyaltyHistoryEntry[]>([])
const [historyLoading, setHistoryLoading] = useState(false)
const [historyPage, setHistoryPage] = useState(0)
const [hasMore, setHasMore] = useState(false)

async function loadHistory(page = 0) {
  setHistoryLoading(true)
  try {
    const res = await fetch(`/api/loyalty/history?page=${page}`)
    const data = await res.json()
    setHistory(prev => page === 0 ? data.history : [...prev, ...data.history])
    setHasMore(data.hasMore)
    setHistoryPage(page)
  } catch { /* silent */ }
  finally { setHistoryLoading(false) }
}

// Load on tab switch
useEffect(() => {
  if (activeTab === 'history') loadHistory(0)
}, [activeTab])
```

Render each history entry:
```typescript
{history.map((entry) => (
  <div key={entry.id} className="flex items-center justify-between py-3 border-b border-white/5">
    <div>
      <p className="text-sm font-medium">{entry.label}</p>
      <p className="text-xs text-white/40">
        {new Date(entry.created_at).toLocaleDateString('pl-PL')}
      </p>
    </div>
    <span className={`text-sm font-bold ${entry.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {entry.points > 0 ? '+' : ''}{entry.points} pkt
    </span>
  </div>
))}
{hasMore && (
  <button onClick={() => loadHistory(historyPage + 1)} className="w-full py-3 text-sm text-white/50">
    {historyLoading ? 'Ladowanie...' : 'Zaladuj wiecej'}
  </button>
)}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add "src/app/(main)/loyalty/page.tsx"
git commit -m "feat: implement loyalty history tab with pagination"
```

---

### Task 11: Show earned points on order confirmation

**Files:**
- Modify: `src/app/(main)/order-confirmation/page.tsx`

**Step 1: Add points earned section**

After the order summary section, add a points earned card:

```typescript
{confirmation.pointsEarned > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-meso-gold-400/30 bg-meso-gold-400/5 p-4"
  >
    <div className="flex items-center gap-2">
      <Star className="h-5 w-5 text-meso-gold-400" />
      <p className="text-sm font-semibold text-meso-gold-400">
        +{confirmation.pointsEarned} punktow MESO Club
      </p>
    </div>
    {confirmation.isFirstOrder && (
      <p className="mt-1 ml-7 text-xs text-meso-gold-400/70">
        W tym +50 pkt bonus za pierwsze zamowienie!
      </p>
    )}
  </motion.div>
)}
```

**Step 2: Add fields to OrderConfirmation type and buildConfirmation function**

In the `buildConfirmation` function, add:
```typescript
pointsEarned: order.loyalty_points_earned || 0,
isFirstOrder: false, // Will be set after checking order count
```

After building confirmation, check if first order:
```typescript
const { count } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('customer_id', order.customer_id)
  .eq('status', 'delivered')
confirmation.isFirstOrder = (count || 0) <= 1
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add "src/app/(main)/order-confirmation/page.tsx"
git commit -m "feat: show earned loyalty points and first order bonus on confirmation"
```

---

### Task 12: Add min_tier field to operator loyalty settings

**Files:**
- Modify: `src/app/operator/settings/loyalty/page.tsx`
- Modify: `src/app/api/operator/settings/loyalty-rewards/route.ts`

**Step 1: Add min_tier to the reward form**

In the loyalty settings page, add a tier select dropdown after the reward_type field:

```typescript
<div>
  <label className="text-sm text-white/60">Min. tier</label>
  <select
    value={form.min_tier || 'bronze'}
    onChange={(e) => setForm({ ...form, min_tier: e.target.value })}
    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
  >
    <option value="bronze">Bronze (wszyscy)</option>
    <option value="silver">Silver</option>
    <option value="gold">Gold</option>
  </select>
</div>
```

**Step 2: Include min_tier in API POST and PATCH**

In `src/app/api/operator/settings/loyalty-rewards/route.ts`, add `min_tier` to the fields accepted in POST and PATCH handlers.

**Step 3: Display min_tier badge on reward list rows**

If `min_tier !== 'bronze'`, show a small badge like "Silver" or "Gold" next to the reward name.

**Step 4: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 5: Commit**

```bash
git add src/app/operator/settings/loyalty/page.tsx src/app/api/operator/settings/loyalty-rewards/route.ts
git commit -m "feat: add min_tier field to operator loyalty reward settings"
```

---

## Phase 5: Referral System

### Task 13: Add referral phone field to registration

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

**Step 1: Add optional phone field for referrer**

Add below the existing form fields:

```typescript
const [referralPhone, setReferralPhone] = useState('')

// In form JSX, after marketing consent:
<div>
  <label className="text-sm text-white/60">Numer telefonu polecajacego (opcjonalnie)</label>
  <input
    type="tel"
    value={referralPhone}
    onChange={(e) => setReferralPhone(e.target.value)}
    placeholder="np. 501234567"
    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
  />
  <p className="mt-1 text-xs text-white/40">
    Podaj numer osoby, ktora Cie polecila — dostaniesz kupon powitalny na darmowy dodatek!
  </p>
</div>
```

**Step 2: Pass referral phone to a new API after registration**

After `supabase.auth.signUp()` succeeds, call:

```typescript
if (referralPhone.trim()) {
  await fetch('/api/loyalty/apply-referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referral_phone: referralPhone.trim() }),
  })
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 4: Commit**

```bash
git add "src/app/(auth)/register/page.tsx"
git commit -m "feat: add referral phone field to registration form"
```

---

### Task 14: Create referral validation and welcome coupon API

**Files:**
- Create: `src/app/api/loyalty/apply-referral/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { referral_phone } = await request.json()
    if (!referral_phone) {
      return NextResponse.json({ error: 'Brak numeru telefonu' }, { status: 400 })
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if customer already has a referrer
    const { data: currentCustomer } = await serviceClient
      .from('customers')
      .select('id, referred_by, phone')
      .eq('id', user.id)
      .single()

    if (!currentCustomer) {
      return NextResponse.json({ error: 'Klient nie znaleziony' }, { status: 404 })
    }

    if (currentCustomer.referred_by) {
      return NextResponse.json({ error: 'Juz masz polecajacego' }, { status: 409 })
    }

    // Clean phone number (remove spaces, dashes, +48 prefix)
    const cleanPhone = referral_phone.replace(/[\s\-\+]/g, '').replace(/^48/, '')

    // Find referrer by phone
    const { data: referrer } = await serviceClient
      .from('customers')
      .select('id, phone')
      .or(`phone.eq.${cleanPhone},phone.eq.+48${cleanPhone},phone.eq.48${cleanPhone}`)
      .neq('id', user.id)
      .maybeSingle()

    if (!referrer) {
      return NextResponse.json(
        { error: 'Nie znaleziono klienta z tym numerem telefonu' },
        { status: 404 }
      )
    }

    // Check referrer has at least 1 delivered order
    const { count: referrerOrders } = await serviceClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', referrer.id)
      .eq('status', 'delivered')

    if (!referrerOrders || referrerOrders < 1) {
      return NextResponse.json(
        { error: 'Polecajacy musi miec co najmniej jedno zrealizowane zamowienie' },
        { status: 400 }
      )
    }

    // Check monthly referral limit (max 10)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyReferrals } = await serviceClient
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', referrer.id)
      .gte('created_at', startOfMonth.toISOString())

    if (monthlyReferrals && monthlyReferrals >= 10) {
      return NextResponse.json(
        { error: 'Polecajacy osiagnal limit polecen w tym miesiacu' },
        { status: 429 }
      )
    }

    // Set referrer
    await serviceClient
      .from('customers')
      .update({ referred_by: referrer.id })
      .eq('id', user.id)

    // Create welcome coupon (free product, 7 days validity)
    const code = 'WELCOME-' + nanoid(5).toUpperCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await serviceClient
      .from('loyalty_coupons')
      .insert({
        customer_id: user.id,
        reward_id: null,
        code,
        coupon_type: 'free_product',
        free_product_name: 'Gyoza (6 szt)',
        status: 'active',
        points_spent: 0,
        source: 'referral_welcome',
        expires_at: expiresAt,
      })

    return NextResponse.json({
      success: true,
      message: 'Polecenie zastosowane! Masz kupon powitalny na darmowe Gyoza.',
      coupon_code: code,
    })

  } catch {
    return NextResponse.json({ error: 'Wystapil blad serwera' }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/api/loyalty/apply-referral/route.ts
git commit -m "feat: add referral validation and welcome coupon API"
```

---

## Phase 6: Final Integration & Cleanup

### Task 15: Update checkout page to show coupon in summary

**Files:**
- Modify: `src/app/(main)/checkout/page.tsx`

**Step 1: Show coupon info in order summary**

Where promo discount is displayed, also handle coupon display:

```typescript
const loyaltyCoupon = useCartStore((s) => s.loyaltyCoupon)

// In summary section:
{(promoCode || loyaltyCoupon) && (
  <div className="flex justify-between text-sm">
    <span className="text-white/60">
      {loyaltyCoupon ? `Kupon: ${loyaltyCoupon.code}` : `Kod: ${promoCode}`}
    </span>
    <span className="text-green-400">
      {loyaltyCoupon?.coupon_type === 'free_delivery' ? 'Darmowa dostawa' :
       loyaltyCoupon?.coupon_type === 'free_product' ? loyaltyCoupon.free_product_name :
       `-${getDiscount().toFixed(2)} zl`}
    </span>
  </div>
)}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add "src/app/(main)/checkout/page.tsx"
git commit -m "feat: display loyalty coupon info in checkout summary"
```

---

### Task 16: Add useCustomerLoyalty refresh and lifetime_points

**Files:**
- Modify: `src/hooks/useCustomerLoyalty.ts`

**Step 1: Add lifetime_points to the query and expose refresh**

```typescript
// Add lifetime_points to select
const { data } = await supabase
  .from('customers')
  .select('loyalty_points, loyalty_tier, lifetime_points')
  .eq('id', user.id)
  .single()

// Return lifetime_points and a refresh function
return {
  points: data?.loyalty_points || 0,
  tier: data?.loyalty_tier || 'bronze',
  lifetimePoints: data?.lifetime_points || 0,
  isLoading,
  refresh: fetchLoyalty, // expose the fetch function for manual refresh
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/hooks/useCustomerLoyalty.ts
git commit -m "feat: add lifetime_points and refresh to useCustomerLoyalty hook"
```

---

### Task 17: Full build and push

**Step 1: Final build check**

Run: `npm run build`
Expected: Build passes with no errors

**Step 2: Push all changes**

Run: `git push origin main`

**Step 3: Verify Vercel deployment**

Run: `cd meso-app && vercel ls 2>&1 | head -8`
Wait for `● Ready` status.

**Step 4: Browser verification**

Navigate to production URL and verify:
1. `/operator/settings/loyalty` — min_tier dropdown visible
2. `/account/club` — rewards show tier badges, "Aktywuj" button present
3. `/cart` — coupon suggestion banner visible for logged-in users with points
4. `/loyalty` — history tab loads data
5. `/register` — referral phone field visible

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Database | Task 1 | Schema: loyalty_coupons, lifetime_points, min_tier, updated triggers |
| 2. Backend | Tasks 2-6 | APIs: activate coupon, get active coupon, history. Checkout integration. |
| 3. Frontend Core | Tasks 7-9 | MESO Club activation, cart coupon display, sync |
| 4. Improvements | Tasks 10-12 | History page, order confirmation points, operator min_tier |
| 5. Referral | Tasks 13-14 | Registration phone field, welcome coupon API |
| 6. Integration | Tasks 15-17 | Checkout summary, hook updates, final deploy |
