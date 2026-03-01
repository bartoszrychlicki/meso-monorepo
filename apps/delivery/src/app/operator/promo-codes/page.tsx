'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { toast } from 'sonner'

interface PromoCode {
  id: string
  code: string
  discount_type: 'percent' | 'fixed' | 'free_item' | 'free_delivery'
  discount_value: number | null
  free_product_id: string | null
  min_order_value: number | null
  max_uses: number | null
  uses_count: number
  first_order_only: boolean
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

type PromoStatus = 'active' | 'expired' | 'exhausted' | 'inactive' | 'scheduled'

function getPromoStatus(code: PromoCode): PromoStatus {
  if (!code.is_active) return 'inactive'
  if (code.valid_until && new Date(code.valid_until) < new Date()) return 'expired'
  if (code.valid_from && new Date(code.valid_from) > new Date()) return 'scheduled'
  if (code.max_uses != null && code.max_uses > 0 && code.uses_count >= code.max_uses) return 'exhausted'
  return 'active'
}

const PROMO_STATUS_CONFIG: Record<PromoStatus, { label: string; className: string }> = {
  active: { label: 'Aktywny', className: 'bg-green-500/20 text-green-400' },
  expired: { label: 'Wygasł', className: 'bg-orange-500/20 text-orange-400' },
  exhausted: { label: 'Wyczerpany', className: 'bg-yellow-500/20 text-yellow-400' },
  inactive: { label: 'Nieaktywny', className: 'bg-red-500/20 text-red-400' },
  scheduled: { label: 'Zaplanowany', className: 'bg-blue-500/20 text-blue-400' },
}

const DISCOUNT_TYPES = [
  { value: 'percent', label: 'Procent (%)' },
  { value: 'fixed', label: 'Kwota (PLN)' },
  { value: 'free_item', label: 'Darmowy produkt' },
  { value: 'free_delivery', label: 'Darmowa dostawa' },
]

type DiscountType = PromoCode['discount_type']

interface PromoFormData {
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  max_uses: number
  first_order_only: boolean
  valid_until: string
  is_active: boolean
}

const emptyForm: PromoFormData = {
  code: '',
  discount_type: 'percent',
  discount_value: 0,
  min_order_value: 0,
  max_uses: 0,
  first_order_only: false,
  valid_until: '',
  is_active: true,
}

export default function PromoCodesSettingsPage() {
  const { pin } = useOperatorAuthStore()

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<PromoFormData>({ ...emptyForm })
  const [addSaving, setAddSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PromoFormData>({ ...emptyForm })
  const [editSaving, setEditSaving] = useState(false)

  const headers = {
    'x-operator-pin': pin,
    'Content-Type': 'application/json',
  }

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/operator/settings/promo-codes', { headers })
      if (!res.ok) throw new Error('Błąd pobierania kodów')
      const data = await res.json()
      setCodes(data.promoCodes ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd pobierania kodów')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  const discountTypeLabel = (type: string) =>
    DISCOUNT_TYPES.find((t) => t.value === type)?.label ?? type

  const formatDiscount = (code: PromoCode) => {
    switch (code.discount_type) {
      case 'percent':
        return `${code.discount_value ?? 0}%`
      case 'fixed':
        return `${code.discount_value ?? 0} PLN`
      case 'free_delivery':
        return 'Darmowa dostawa'
      case 'free_item':
        return 'Darmowy produkt'
      default:
        return '-'
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.code) {
      toast.error('Kod jest wymagany')
      return
    }

    setAddSaving(true)
    try {
      const body: Record<string, unknown> = {
        code: addForm.code.toUpperCase(),
        discount_type: addForm.discount_type,
        is_active: addForm.is_active,
        first_order_only: addForm.first_order_only,
        discount_value: addForm.discount_value || null,
        min_order_value: addForm.min_order_value || null,
        max_uses: addForm.max_uses || null,
        valid_until: addForm.valid_until || null,
      }

      const res = await fetch('/api/operator/settings/promo-codes', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dodawania kodu')
      }

      toast.success('Kod promocyjny został dodany')
      setAddForm({ ...emptyForm })
      setShowAddForm(false)
      fetchCodes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dodawania')
    } finally {
      setAddSaving(false)
    }
  }

  const startEdit = (code: PromoCode) => {
    setEditingId(code.id)
    setEditForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value ?? 0,
      min_order_value: code.min_order_value ?? 0,
      max_uses: code.max_uses ?? 0,
      first_order_only: code.first_order_only,
      valid_until: code.valid_until ? code.valid_until.slice(0, 10) : '',
      is_active: code.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...emptyForm })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    setEditSaving(true)
    try {
      const body: Record<string, unknown> = {
        id: editingId,
        code: editForm.code.toUpperCase(),
        discount_type: editForm.discount_type,
        is_active: editForm.is_active,
        first_order_only: editForm.first_order_only,
        discount_value: editForm.discount_value || null,
        min_order_value: editForm.min_order_value || null,
        max_uses: editForm.max_uses || null,
        valid_until: editForm.valid_until || null,
      }

      const res = await fetch('/api/operator/settings/promo-codes', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd edycji kodu')
      }

      toast.success('Kod promocyjny został zaktualizowany')
      setEditingId(null)
      setEditForm({ ...emptyForm })
      fetchCodes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd edycji')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch('/api/operator/settings/promo-codes', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dezaktywacji kodu')
      }

      toast.success('Kod promocyjny został dezaktywowany')
      fetchCodes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dezaktywacji')
    }
  }

  const renderForm = (
    form: PromoFormData,
    setForm: React.Dispatch<React.SetStateAction<PromoFormData>>,
    onSubmit: (e: React.FormEvent) => void,
    saving: boolean,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form onSubmit={onSubmit} className="p-4 bg-meso-dark-900 rounded-xl border border-white/10 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-white/60">Kod</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none uppercase"
            placeholder="np. RAMEN15"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Typ zniżki</label>
          <select
            value={form.discount_type}
            onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as DiscountType }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
          >
            {DISCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Wartość zniżki</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.discount_value}
            onChange={(e) => setForm((p) => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Min. wartość zamówienia (PLN)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.min_order_value}
            onChange={(e) => setForm((p) => ({ ...p, min_order_value: parseFloat(e.target.value) || 0 }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Max użyć (0 = bez limitu)</label>
          <input
            type="number"
            min="0"
            value={form.max_uses}
            onChange={(e) => setForm((p) => ({ ...p, max_uses: parseInt(e.target.value) || 0 }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Ważny do</label>
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.first_order_only}
            onChange={(e) => setForm((p) => ({ ...p, first_order_only: e.target.checked }))}
            className="w-4 h-4 rounded border-white/10 bg-meso-dark-900 text-meso-red-500 focus:ring-meso-red-500"
          />
          <span className="text-sm text-white/60">Tylko pierwsze zamówienie</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="w-4 h-4 rounded border-white/10 bg-meso-dark-900 text-meso-red-500 focus:ring-meso-red-500"
          />
          <span className="text-sm text-white/60">Aktywny</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-meso-red-500 hover:bg-meso-red-600 disabled:opacity-50 text-white font-bold h-10 px-6 rounded-xl transition-colors flex items-center gap-2 text-sm"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white/10 hover:bg-white/20 text-white font-medium h-10 px-6 rounded-xl transition-colors text-sm"
        >
          Anuluj
        </button>
      </div>
    </form>
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-white/60" />
            <h2 className="text-lg font-medium text-white">Kody promocyjne</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-meso-red-500 hover:bg-meso-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
          >
            {showAddForm ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Zwiń
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Dodaj kod
              </>
            )}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Nowy kod promocyjny</h3>
            {renderForm(
              addForm,
              setAddForm,
              handleAdd,
              addSaving,
              () => setShowAddForm(false),
              'Dodaj'
            )}
          </div>
        )}

        {/* Codes list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-meso-red-500 animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <p className="text-white/40 text-center py-8">
            Brak kodów promocyjnych
          </p>
        ) : (
          <div className="space-y-3">
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-8 gap-3 px-4 py-2 text-xs text-white/40 uppercase tracking-wider">
              <div>Kod</div>
              <div>Typ</div>
              <div>Wartość</div>
              <div>Min. zamówienie</div>
              <div>Użycia</div>
              <div>Ważny do</div>
              <div>Status</div>
              <div>Akcje</div>
            </div>

            {codes.map((code) =>
              editingId === code.id ? (
                <div key={code.id}>
                  {renderForm(
                    editForm,
                    setEditForm,
                    handleSaveEdit,
                    editSaving,
                    cancelEdit,
                    'Zapisz'
                  )}
                </div>
              ) : (
                <div
                  key={code.id}
                  className={`p-4 rounded-xl border ${
                    getPromoStatus(code) === 'active'
                      ? 'bg-meso-dark-900 border-white/5'
                      : 'bg-meso-dark-900/50 border-white/5 opacity-60'
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="lg:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono font-bold">{code.code}</span>
                        {(() => {
                          const status = getPromoStatus(code)
                          if (status === 'active') return null
                          const config = PROMO_STATUS_CONFIG[status]
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.className}`}>
                              {config.label}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(code)}
                          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {code.is_active && (
                          <button
                            onClick={() => handleDeactivate(code.id)}
                            className="bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40">
                      <span>{discountTypeLabel(code.discount_type)}</span>
                      <span>|</span>
                      <span>{formatDiscount(code)}</span>
                      {code.min_order_value && (
                        <>
                          <span>|</span>
                          <span>Min. {code.min_order_value} PLN</span>
                        </>
                      )}
                      <span>|</span>
                      <span>
                        {code.uses_count}/{code.max_uses || '~'}
                      </span>
                      {code.valid_until && (
                        <>
                          <span>|</span>
                          <span>Do {new Date(code.valid_until).toLocaleDateString('pl-PL')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden lg:grid grid-cols-8 gap-3 items-center">
                    <div className="text-white font-mono font-bold">{code.code}</div>
                    <div className="text-sm text-white/60">{discountTypeLabel(code.discount_type)}</div>
                    <div className="text-sm text-white">{formatDiscount(code)}</div>
                    <div className="text-sm text-white/60">
                      {code.min_order_value ? `${code.min_order_value} PLN` : '-'}
                    </div>
                    <div className="text-sm text-white/60">
                      {code.uses_count}/{code.max_uses || '~'}
                    </div>
                    <div className="text-sm text-white/60">
                      {code.valid_until
                        ? new Date(code.valid_until).toLocaleDateString('pl-PL')
                        : '-'}
                    </div>
                    <div>
                      {(() => {
                        const status = getPromoStatus(code)
                        const config = PROMO_STATUS_CONFIG[status]
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full ${config.className}`}>
                            {config.label}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(code)}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {code.is_active && (
                        <button
                          onClick={() => handleDeactivate(code.id)}
                          className="bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 p-2 rounded-lg transition-colors"
                          title="Dezaktywuj"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
