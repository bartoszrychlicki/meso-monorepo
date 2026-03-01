'use client'

import { useState, useEffect, useCallback } from 'react'
import { Image as ImageIcon, Plus, Pencil, Trash2, Loader2, X, ExternalLink } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { toast } from 'sonner'

interface PromoBanner {
  id: string
  image_url: string
  title: string
  subtitle: string | null
  href: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

interface BannerFormData {
  image_url: string
  title: string
  subtitle: string
  href: string
  sort_order: number
  is_active: boolean
}

const emptyForm: BannerFormData = {
  image_url: '',
  title: '',
  subtitle: '',
  href: '',
  sort_order: 0,
  is_active: true,
}

export default function BannersSettingsPage() {
  const { pin } = useOperatorAuthStore()

  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<BannerFormData>({ ...emptyForm })
  const [addSaving, setAddSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BannerFormData>({ ...emptyForm })
  const [editSaving, setEditSaving] = useState(false)

  const headers = {
    'x-operator-pin': pin,
    'Content-Type': 'application/json',
  }

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/operator/settings/promo-banners', { headers })
      if (!res.ok) throw new Error('Błąd pobierania banerów')
      const data = await res.json()
      setBanners(data.banners ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd pobierania banerów')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.image_url || !addForm.title) {
      toast.error('URL obrazka i tytuł są wymagane')
      return
    }

    setAddSaving(true)
    try {
      const body: Record<string, unknown> = {
        image_url: addForm.image_url,
        title: addForm.title,
        is_active: addForm.is_active,
        sort_order: addForm.sort_order,
      }

      if (addForm.subtitle) body.subtitle = addForm.subtitle
      if (addForm.href) body.href = addForm.href

      const res = await fetch('/api/operator/settings/promo-banners', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dodawania banera')
      }

      toast.success('Baner został dodany')
      setAddForm({ ...emptyForm })
      setShowAddForm(false)
      fetchBanners()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dodawania')
    } finally {
      setAddSaving(false)
    }
  }

  const startEdit = (banner: PromoBanner) => {
    setEditingId(banner.id)
    setEditForm({
      image_url: banner.image_url,
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      href: banner.href ?? '',
      sort_order: banner.sort_order,
      is_active: banner.is_active,
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
        image_url: editForm.image_url,
        title: editForm.title,
        subtitle: editForm.subtitle || null,
        href: editForm.href || null,
        sort_order: editForm.sort_order,
        is_active: editForm.is_active,
      }

      const res = await fetch('/api/operator/settings/promo-banners', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd edycji banera')
      }

      toast.success('Baner został zaktualizowany')
      setEditingId(null)
      setEditForm({ ...emptyForm })
      fetchBanners()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd edycji')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch('/api/operator/settings/promo-banners', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dezaktywacji banera')
      }

      toast.success('Baner został dezaktywowany')
      fetchBanners()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dezaktywacji')
    }
  }

  const renderForm = (
    form: BannerFormData,
    setForm: React.Dispatch<React.SetStateAction<BannerFormData>>,
    onSubmit: (e: React.FormEvent) => void,
    saving: boolean,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form onSubmit={onSubmit} className="p-4 bg-meso-dark-900 rounded-xl border border-white/10 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-white/60">Tytuł</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
            placeholder="np. Promocja zimowa"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Podtytuł</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
            placeholder="Krótki opis"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">URL obrazka</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Link (href)</label>
          <input
            type="text"
            value={form.href}
            onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
            placeholder="/menu/ramen"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Kolejność sortowania</label>
          <input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
            className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer h-12">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-white/10 bg-meso-dark-900 text-meso-red-500 focus:ring-meso-red-500"
            />
            <span className="text-sm text-white/60">Aktywny</span>
          </label>
        </div>
      </div>

      {/* Image preview */}
      {form.image_url && (
        <div className="space-y-2">
          <label className="text-sm text-white/60">Podgląd</label>
          <div className="w-32 h-20 rounded-lg overflow-hidden bg-meso-dark-800 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.image_url}
              alt="Podgląd banera"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

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
            <ImageIcon className="w-5 h-5 text-white/60" />
            <h2 className="text-lg font-medium text-white">Banery promocyjne</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-meso-red-500 hover:bg-meso-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
          >
            {showAddForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showAddForm ? 'Zamknij' : 'Dodaj baner'}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Nowy baner</h3>
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

        {/* Banners list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-meso-red-500 animate-spin" />
          </div>
        ) : banners.length === 0 ? (
          <p className="text-white/40 text-center py-8">
            Brak banerów promocyjnych
          </p>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) =>
              editingId === banner.id ? (
                <div key={banner.id}>
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
                  key={banner.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    banner.is_active
                      ? 'bg-meso-dark-900 border-white/5'
                      : 'bg-meso-dark-900/50 border-white/5 opacity-50'
                  }`}
                >
                  {/* Image preview */}
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-meso-dark-800 border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = ''
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium truncate">{banner.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                        #{banner.sort_order}
                      </span>
                      {!banner.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          Nieaktywny
                        </span>
                      )}
                    </div>
                    {banner.subtitle && (
                      <p className="text-sm text-white/40 truncate mt-0.5">{banner.subtitle}</p>
                    )}
                    {banner.href && (
                      <div className="flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/30 truncate">{banner.href}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(banner)}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                      title="Edytuj"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {banner.is_active && (
                      <button
                        onClick={() => handleDeactivate(banner.id)}
                        className="bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 p-2 rounded-lg transition-colors"
                        title="Dezaktywuj"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
