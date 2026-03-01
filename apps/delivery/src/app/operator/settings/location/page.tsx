'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, Clock, Truck, Store, CreditCard, Timer } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { toast } from 'sonner'

interface LocationSettings {
  id: string
  name: string
  address: string
  city: string
  delivery_fee: number
  min_order_value: number
  delivery_time_min: number
  delivery_time_max: number
  open_time: string
  close_time: string
  delivery_radius_km: number
}

export default function LocationSettingsPage() {
  const { pin } = useOperatorAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    delivery_fee: 0,
    min_order_value: 0,
    delivery_time_min: 0,
    delivery_time_max: 0,
    open_time: '',
    close_time: '',
    delivery_radius_km: 0,
  })
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(20)
  const [pickupBufferAfterOpen, setPickupBufferAfterOpen] = useState(30)
  const [pickupBufferBeforeClose, setPickupBufferBeforeClose] = useState(30)
  const [pickupOnlineFee, setPickupOnlineFee] = useState(0)
  const [payOnPickupFee, setPayOnPickupFee] = useState(2)
  const [payOnPickupMaxOrder, setPayOnPickupMaxOrder] = useState(100)

  useEffect(() => {
    fetchLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchLocation = async () => {
    setLoading(true)
    try {
      const [locationRes, configRes] = await Promise.all([
        fetch('/api/operator/settings/location', {
          headers: {
            'x-operator-pin': pin,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/operator/settings/config', {
          headers: {
            'x-operator-pin': pin,
            'Content-Type': 'application/json',
          },
        }),
      ])

      if (!locationRes.ok) {
        throw new Error('Nie udało się pobrać ustawień lokalizacji')
      }

      const data = await locationRes.json()
      const loc: LocationSettings = data.location

      setForm({
        name: loc.name ?? '',
        address: loc.address ?? '',
        city: loc.city ?? '',
        delivery_fee: loc.delivery_fee ?? 0,
        min_order_value: loc.min_order_value ?? 0,
        delivery_time_min: loc.delivery_time_min ?? 0,
        delivery_time_max: loc.delivery_time_max ?? 0,
        open_time: loc.open_time ?? '',
        close_time: loc.close_time ?? '',
        delivery_radius_km: loc.delivery_radius_km ?? 0,
      })

      if (configRes.ok) {
        const configData = await configRes.json()
        const configArr: { key: string; value: string }[] = configData.config ?? []
        const afterOpen = configArr.find((c) => c.key === 'pickup_buffer_after_open')
        const beforeClose = configArr.find((c) => c.key === 'pickup_buffer_before_close')
        if (afterOpen) setPickupBufferAfterOpen(parseInt(afterOpen.value) || 30)
        if (beforeClose) setPickupBufferBeforeClose(parseInt(beforeClose.value) || 30)
        const waitTime = configArr.find((c) => c.key === 'estimated_wait_time')
        if (waitTime) setEstimatedWaitTime(parseInt(waitTime.value) || 20)
        const onlineFee = configArr.find((c) => c.key === 'pickup_online_fee')
        const pickupFee = configArr.find((c) => c.key === 'pay_on_pickup_fee')
        const pickupMax = configArr.find((c) => c.key === 'pay_on_pickup_max_order')
        if (onlineFee) setPickupOnlineFee(parseFloat(onlineFee.value) || 0)
        if (pickupFee) setPayOnPickupFee(parseFloat(pickupFee.value) || 2)
        if (pickupMax) setPayOnPickupMaxOrder(parseFloat(pickupMax.value) || 100)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const [locationRes, configRes] = await Promise.all([
        fetch('/api/operator/settings/location', {
          method: 'PATCH',
          headers: {
            'x-operator-pin': pin,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }),
        fetch('/api/operator/settings/config', {
          method: 'PATCH',
          headers: {
            'x-operator-pin': pin,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            { key: 'estimated_wait_time', value: String(estimatedWaitTime) },
            { key: 'pickup_buffer_after_open', value: String(pickupBufferAfterOpen) },
            { key: 'pickup_buffer_before_close', value: String(pickupBufferBeforeClose) },
            { key: 'pickup_online_fee', value: String(pickupOnlineFee) },
            { key: 'pay_on_pickup_fee', value: String(payOnPickupFee) },
            { key: 'pay_on_pickup_max_order', value: String(payOnPickupMaxOrder) },
          ]),
        }),
      ])

      if (!locationRes.ok) {
        const data = await locationRes.json()
        throw new Error(data.error || 'Nie udało się zapisać ustawień lokalizacji')
      }

      if (!configRes.ok) {
        const data = await configRes.json()
        throw new Error(data.error || 'Nie udało się zapisać buforów odbioru')
      }

      toast.success('Ustawienia lokalizacji zostały zapisane')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-meso-red-500 animate-spin" />
        </div>
      </div>
    )
  }

  const inputClass = "w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Section: Dane lokalizacji ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Dane lokalizacji</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Nazwa lokalu</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="np. MESO Gdańsk Długa"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Adres</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="np. ul. Długa 15"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Miasto</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="np. Gdańsk"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Godziny otwarcia ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Godziny otwarcia</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Godzina otwarcia</label>
                <input
                  type="time"
                  value={form.open_time}
                  onChange={(e) => handleChange('open_time', e.target.value)}
                  className={`${inputClass} [color-scheme:dark]`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60">Godzina zamknięcia</label>
                <input
                  type="time"
                  value={form.close_time}
                  onChange={(e) => handleChange('close_time', e.target.value)}
                  className={`${inputClass} [color-scheme:dark]`}
                />
              </div>
            </div>
          </div>

          {/* ── Section: Czas oczekiwania ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Timer className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Czas oczekiwania</h2>
            </div>

            <div className="max-w-xs space-y-2">
              <label className="text-sm text-white/60">Szacowany czas oczekiwania (minuty)</label>
              <input
                type="number"
                min="1"
                value={estimatedWaitTime}
                onChange={(e) => setEstimatedWaitTime(parseInt(e.target.value) || 20)}
                className={inputClass}
              />
              <p className="text-xs text-white/40">
                Wyświetlany klientom w checkoucie i na stronie śledzenia zamówienia
              </p>
            </div>
          </div>

          {/* ── Section: Dostawa ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Truck className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Dostawa</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Promień dostawy (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.delivery_radius_km}
                    onChange={(e) => handleChange('delivery_radius_km', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Minimalna wartość zamówienia (PLN)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_order_value}
                    onChange={(e) => handleChange('min_order_value', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Czas dostawy min (minuty)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.delivery_time_min}
                    onChange={(e) => handleChange('delivery_time_min', parseInt(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Czas dostawy max (minuty)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.delivery_time_max}
                    onChange={(e) => handleChange('delivery_time_max', parseInt(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Odbiór osobisty ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <Store className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Odbiór osobisty</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Bufor po otwarciu (minuty)</label>
                <input
                  type="number"
                  min="0"
                  value={pickupBufferAfterOpen}
                  onChange={(e) => setPickupBufferAfterOpen(parseInt(e.target.value) || 0)}
                  className={inputClass}
                />
                <p className="text-xs text-white/40">
                  Czas po otwarciu, w którym odbiór osobisty nie jest jeszcze dostępny
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60">Bufor przed zamknięciem (minuty)</label>
                <input
                  type="number"
                  min="0"
                  value={pickupBufferBeforeClose}
                  onChange={(e) => setPickupBufferBeforeClose(parseInt(e.target.value) || 0)}
                  className={inputClass}
                />
                <p className="text-xs text-white/40">
                  Czas przed zamknięciem, od którego odbiór osobisty nie jest już dostępny
                </p>
              </div>
            </div>
          </div>

          {/* ── Section: Cennik i opłaty ── */}
          <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-5 h-5 text-meso-red-500" />
              <h2 className="text-base font-semibold text-white">Cennik i opłaty</h2>
            </div>

            <div className="space-y-5">
              {/* Delivery fee */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Dostawa</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Opłata za dostawę (PLN)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.delivery_fee}
                      onChange={(e) => handleChange('delivery_fee', parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                    <p className="text-xs text-white/40">
                      Opłata naliczana za dostawę pod adres klienta
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* Pickup online fee */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Odbiór osobisty — płatność online</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Opłata za odbiór (PLN)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pickupOnlineFee}
                        onChange={(e) => setPickupOnlineFee(parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                      {pickupOnlineFee === 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-green-400">
                          Gratis
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40">
                      Opłata za odbiór osobisty z płatnością online. 0 = Gratis
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* Pay on pickup fees */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">Płatność przy odbiorze (karta/BLIK na miejscu)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Dopłata za płatność na miejscu (PLN)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payOnPickupFee}
                      onChange={(e) => setPayOnPickupFee(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                    <p className="text-xs text-white/40">
                      Dodatkowa opłata gdy klient płaci kartą/BLIK na miejscu
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Maks. wartość zamówienia (PLN)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={payOnPickupMaxOrder}
                      onChange={(e) => setPayOnPickupMaxOrder(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                    <p className="text-xs text-white/40">
                      Powyżej tej kwoty płatność przy odbiorze jest niedostępna
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="bg-meso-red-500 hover:bg-meso-red-600 disabled:opacity-50 text-white font-bold h-12 px-8 rounded-xl transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Zapisz zmiany
          </button>
        </form>
      </div>
    </div>
  )
}
