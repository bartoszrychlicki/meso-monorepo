# Pickup Hours & Buffers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Checkout time slots respect location opening hours and operator-configurable buffers (after open / before close).

**Architecture:** Two new `app_config` keys (`pickup_buffer_after_open`, `pickup_buffer_before_close`) editable in operator settings. Checkout fetches location hours + buffers and generates time slots accordingly. No DB migration needed — `app_config` is a key-value store with upsert.

**Tech Stack:** Next.js, Supabase (app_config + locations tables), existing useAppConfig hook

---

### Task 1: Seed buffer config entries

**Files:**
- Modify: `supabase/migrations/20260224_dynamic_config.sql` (append at end)

**Step 1: Add INSERT statements for new config keys**

Append to the end of the migration file:

```sql
-- Pickup buffers (minutes) — configurable by operator
INSERT INTO app_config (key, value, description)
VALUES
  ('pickup_buffer_after_open', '30', 'Minuty po otwarciu — najwcześniejszy możliwy odbiór'),
  ('pickup_buffer_before_close', '30', 'Minuty przed zamknięciem — najpóźniejszy możliwy odbiór')
ON CONFLICT (key) DO NOTHING;
```

**Step 2: Push migration to remote**

Run: `npx supabase db push --project-ref yqkeookdocziyaypirqg`

If the INSERT conflicts (keys already exist), `ON CONFLICT DO NOTHING` makes it safe.

**Step 3: Commit**

```bash
git add supabase/migrations/20260224_dynamic_config.sql
git commit -m "feat: seed pickup buffer config entries in app_config"
```

---

### Task 2: Add buffer fields to operator location settings page

**Files:**
- Modify: `src/app/operator/settings/location/page.tsx`

**Step 1: Add buffer state and fetching**

The page already fetches location settings. Add buffer state that fetches from `/api/operator/settings/config` on mount, and saves via PATCH to the same endpoint on submit.

Add to `LocationSettings` interface — no changes needed (buffers are separate).

Add new state:
```ts
const [buffers, setBuffers] = useState({
  pickup_buffer_after_open: 30,
  pickup_buffer_before_close: 30,
})
```

In the existing `fetchLocation` function, add a second fetch to `/api/operator/settings/config` to read buffer values. Parse them from the config array.

**Step 2: Add buffer input fields to the form**

After the "Godziny otwarcia" section (open_time/close_time), add a new section:

```
<!-- Bufory odbioru -->
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label>Bufor po otwarciu (minuty)</label>
    <input type="number" min="0" step="5" />
    <p className="helper">Najwcześniejszy odbiór = otwarcie + bufor</p>
  </div>
  <div>
    <label>Bufor przed zamknięciem (minuty)</label>
    <input type="number" min="0" step="5" />
    <p className="helper">Najpóźniejszy odbiór = zamknięcie - bufor</p>
  </div>
</div>
```

Use the same styling as existing fields: `w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none`

**Step 3: Save buffers on form submit**

In `handleSubmit`, after the existing location PATCH, add a second fetch to save buffers:

```ts
await fetch('/api/operator/settings/config', {
  method: 'PATCH',
  headers: { 'x-operator-pin': pin, 'Content-Type': 'application/json' },
  body: JSON.stringify([
    { key: 'pickup_buffer_after_open', value: String(buffers.pickup_buffer_after_open) },
    { key: 'pickup_buffer_before_close', value: String(buffers.pickup_buffer_before_close) },
  ]),
})
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/app/operator/settings/location/page.tsx
git commit -m "feat: add pickup buffer settings to operator location page"
```

---

### Task 3: Checkout — fetch location hours and buffers, generate dynamic time slots

**Files:**
- Modify: `src/app/(main)/checkout/page.tsx`

**Step 1: Replace hardcoded generateTimeSlots with dynamic version**

Remove the current `generateTimeSlots()` function and `useMemo` call.

Add state for location hours and buffers:
```ts
const [locationHours, setLocationHours] = useState<{
  open_time: string
  close_time: string
} | null>(null)

const [pickupBuffers, setPickupBuffers] = useState({
  after_open: 30,
  before_close: 30,
})
```

Add a `useEffect` that fetches both from Supabase (client-side, no PIN needed — these are public data):

```ts
useEffect(() => {
  const supabase = createClient()

  // Fetch location hours
  supabase
    .from('locations')
    .select('open_time, close_time')
    .eq('is_default', true)
    .single()
    .then(({ data }) => {
      if (data) setLocationHours(data)
    })

  // Fetch pickup buffers from app_config
  supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['pickup_buffer_after_open', 'pickup_buffer_before_close'])
    .then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        for (const row of data) map[row.key] = row.value as string
        setPickupBuffers({
          after_open: parseInt(map.pickup_buffer_after_open) || 30,
          before_close: parseInt(map.pickup_buffer_before_close) || 30,
        })
      }
    })
}, [])
```

**Step 2: Create dynamic generateTimeSlots function**

```ts
const timeSlots = useMemo(() => {
  if (!locationHours) return []

  const now = new Date()

  // Parse open/close times (format: "HH:MM:SS" or "HH:MM")
  const [openH, openM] = locationHours.open_time.split(':').map(Number)
  const [closeH, closeM] = locationHours.close_time.split(':').map(Number)

  // Earliest pickup = open + buffer_after_open
  const earliest = new Date(now)
  earliest.setHours(openH, openM, 0, 0)
  earliest.setMinutes(earliest.getMinutes() + pickupBuffers.after_open)

  // Latest pickup = close - buffer_before_close
  const latest = new Date(now)
  latest.setHours(closeH, closeM, 0, 0)
  latest.setMinutes(latest.getMinutes() - pickupBuffers.before_close)

  // Start from max(earliest, now + 30 min), rounded up to next 15-min slot
  const minTime = new Date(Math.max(earliest.getTime(), now.getTime() + 30 * 60 * 1000))
  minTime.setMinutes(Math.ceil(minTime.getMinutes() / 15) * 15, 0, 0)

  const slots: string[] = []
  let cursor = new Date(minTime)
  while (cursor <= latest) {
    slots.push(cursor.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))
    cursor = new Date(cursor.getTime() + 15 * 60 * 1000)
  }
  return slots
}, [locationHours, pickupBuffers])
```

**Step 3: Show "~20 min" based on actual config**

The ASAP button currently hardcodes "~20 min". Replace with actual pickup time from `app_config` (`pickup_time_min`/`pickup_time_max`). Since we already fetch `app_config`, add these keys to the fetch:

Update the `app_config` fetch `.in('key', [...])` to also include `pickup_time_min`, `pickup_time_max`. Show `~{pickup_time_min}-{pickup_time_max} min` on the ASAP button.

**Step 4: Handle edge case — location closed or no slots available**

If `timeSlots` is empty AND the current time is outside open/close hours, show a message: "Lokal jest obecnie zamknięty" instead of the time slots list.

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/(main)/checkout/page.tsx
git commit -m "feat: dynamic pickup time slots based on location hours and buffers"
```

---

## Verification

After all tasks:
1. `npm run build` — no errors
2. Open operator panel → Settings → Location → verify buffer fields appear with defaults (30/30)
3. Change buffers to e.g. 45/15, save, reload — values persist
4. Open checkout — time slots respect open/close hours and buffer offsets
5. Change open_time to e.g. 15:00, reload checkout — slots start from 15:30 (or later if now > 15:30)
