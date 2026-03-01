'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { useOperatorAuthStore } from '@/stores/operatorAuthStore'
import { toast } from 'sonner'

interface TierThresholds {
  bronze: number
  silver: number
  gold: number
}

interface LoyaltyReward {
  id: string
  name: string
  description: string | null
  points_cost: number
  reward_type: 'free_delivery' | 'discount' | 'free_product'
  discount_value: number | null
  icon: string | null
  sort_order: number
  is_active: boolean
  min_tier: 'bronze' | 'silver' | 'gold' | null
}

type RewardType = 'free_delivery' | 'discount' | 'free_product'

const REWARD_TYPES = [
  { value: 'free_delivery', label: 'Darmowa dostawa' },
  { value: 'discount', label: 'Zniżka' },
  { value: 'free_product', label: 'Darmowy produkt' },
]

type TierType = 'bronze' | 'silver' | 'gold'

interface RewardFormData {
  name: string
  description: string
  points_cost: number
  reward_type: RewardType
  discount_value: number
  icon: string
  sort_order: number
  min_tier: TierType
}

const emptyRewardForm: RewardFormData = {
  name: '',
  description: '',
  points_cost: 0,
  reward_type: 'free_delivery',
  discount_value: 0,
  icon: '',
  sort_order: 0,
  min_tier: 'bronze',
}

export default function LoyaltySettingsPage() {
  const { pin } = useOperatorAuthStore()

  // Tier thresholds state
  const [tiers, setTiers] = useState<TierThresholds>({ bronze: 0, silver: 500, gold: 1000 })
  const [tiersLoading, setTiersLoading] = useState(true)
  const [tiersSaving, setTiersSaving] = useState(false)

  // Rewards state
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RewardFormData>(emptyRewardForm)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<RewardFormData>(emptyRewardForm)
  const [addSaving, setAddSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const headers = {
    'x-operator-pin': pin,
    'Content-Type': 'application/json',
  }

  const fetchTiers = useCallback(async () => {
    setTiersLoading(true)
    try {
      const res = await fetch('/api/operator/settings/config', { headers })
      if (!res.ok) throw new Error('Błąd pobierania konfiguracji')
      const data = await res.json()
      const entry = data.config?.find(
        (c: { key: string; value: unknown }) => c.key === 'loyalty_tier_thresholds'
      )
      if (entry?.value) {
        setTiers({
          bronze: entry.value.bronze ?? 0,
          silver: entry.value.silver ?? 500,
          gold: entry.value.gold ?? 1000,
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd pobierania progów')
    } finally {
      setTiersLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const fetchRewards = useCallback(async () => {
    setRewardsLoading(true)
    try {
      const res = await fetch('/api/operator/settings/loyalty-rewards', { headers })
      if (!res.ok) throw new Error('Błąd pobierania nagród')
      const data = await res.json()
      setRewards(data.rewards ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd pobierania nagród')
    } finally {
      setRewardsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  useEffect(() => {
    fetchTiers()
    fetchRewards()
  }, [fetchTiers, fetchRewards])

  // -- Tier thresholds handlers --
  const handleSaveTiers = async (e: React.FormEvent) => {
    e.preventDefault()
    setTiersSaving(true)
    try {
      const res = await fetch('/api/operator/settings/config', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          key: 'loyalty_tier_thresholds',
          value: tiers,
        }),
      })
      if (!res.ok) throw new Error('Błąd zapisu progów')
      toast.success('Progi lojalnościowe zostały zapisane')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd zapisu')
    } finally {
      setTiersSaving(false)
    }
  }

  // -- Reward CRUD handlers --
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name || !addForm.points_cost) {
      toast.error('Nazwa i koszt punktowy są wymagane')
      return
    }

    setAddSaving(true)
    try {
      const res = await fetch('/api/operator/settings/loyalty-rewards', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: addForm.name,
          description: addForm.description || null,
          points_cost: addForm.points_cost,
          reward_type: addForm.reward_type,
          discount_value: addForm.discount_value || null,
          icon: addForm.icon || null,
          sort_order: addForm.sort_order,
          min_tier: addForm.min_tier,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dodawania nagrody')
      }

      toast.success('Nagroda została dodana')
      setAddForm(emptyRewardForm)
      setShowAddForm(false)
      fetchRewards()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dodawania')
    } finally {
      setAddSaving(false)
    }
  }

  const startEdit = (reward: LoyaltyReward) => {
    setEditingId(reward.id)
    setEditForm({
      name: reward.name,
      description: reward.description ?? '',
      points_cost: reward.points_cost,
      reward_type: reward.reward_type,
      discount_value: reward.discount_value ?? 0,
      icon: reward.icon ?? '',
      sort_order: reward.sort_order,
      min_tier: (reward.min_tier as TierType) ?? 'bronze',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyRewardForm)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    setEditSaving(true)
    try {
      const res = await fetch('/api/operator/settings/loyalty-rewards', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: editingId,
          name: editForm.name,
          description: editForm.description || null,
          points_cost: editForm.points_cost,
          reward_type: editForm.reward_type,
          discount_value: editForm.discount_value || null,
          icon: editForm.icon || null,
          sort_order: editForm.sort_order,
          min_tier: editForm.min_tier,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd edycji nagrody')
      }

      toast.success('Nagroda została zaktualizowana')
      setEditingId(null)
      setEditForm(emptyRewardForm)
      fetchRewards()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd edycji')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch('/api/operator/settings/loyalty-rewards', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dezaktywacji nagrody')
      }

      toast.success('Nagroda została dezaktywowana')
      fetchRewards()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dezaktywacji')
    }
  }

  const rewardTypeLabel = (type: string) =>
    REWARD_TYPES.find((t) => t.value === type)?.label ?? type

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Section 1: Tier Thresholds */}
      <div className="max-w-2xl">
        <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-white/60" />
            <h2 className="text-lg font-medium text-white">Progi lojalnościowe</h2>
          </div>

          {tiersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-meso-red-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveTiers} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/60">
                    Bronze (punkty)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tiers.bronze}
                    onChange={(e) =>
                      setTiers((prev) => ({ ...prev, bronze: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">
                    Silver (punkty)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tiers.silver}
                    onChange={(e) =>
                      setTiers((prev) => ({ ...prev, silver: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">
                    Gold (punkty)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tiers.gold}
                    onChange={(e) =>
                      setTiers((prev) => ({ ...prev, gold: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={tiersSaving}
                className="bg-meso-red-500 hover:bg-meso-red-600 disabled:opacity-50 text-white font-bold h-12 px-8 rounded-xl transition-colors flex items-center gap-2"
              >
                {tiersSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Zapisz progi
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Section 2: Loyalty Rewards */}
      <div>
        <div className="bg-meso-dark-800/50 rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-white/60" />
              <h2 className="text-lg font-medium text-white">Nagrody lojalnościowe</h2>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-meso-red-500 hover:bg-meso-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Dodaj nagrodę
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form
              onSubmit={handleAddReward}
              className="mb-6 p-4 bg-meso-dark-900 rounded-xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Nowa nagroda</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Nazwa</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                    placeholder="np. Darmowa dostawa"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Koszt (punkty)</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.points_cost}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, points_cost: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Typ nagrody</label>
                  <select
                    value={addForm.reward_type}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        reward_type: e.target.value as RewardType,
                      }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  >
                    {REWARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Wartość zniżki (PLN)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.discount_value}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        discount_value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Ikona</label>
                  <input
                    type="text"
                    value={addForm.icon}
                    onChange={(e) => setAddForm((p) => ({ ...p, icon: e.target.value }))}
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                    placeholder="np. truck, tag, bowl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Kolejność</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.sort_order}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60">Min. tier</label>
                  <select
                    value={addForm.min_tier || 'bronze'}
                    onChange={(e) => setAddForm((p) => ({ ...p, min_tier: e.target.value as TierType }))}
                    className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  >
                    <option value="bronze">Bronze (wszyscy)</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/60">Opis</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                  placeholder="Krótki opis nagrody"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addSaving}
                  className="bg-meso-red-500 hover:bg-meso-red-600 disabled:opacity-50 text-white font-bold h-10 px-6 rounded-xl transition-colors flex items-center gap-2 text-sm"
                >
                  {addSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Dodaj
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium h-10 px-6 rounded-xl transition-colors text-sm"
                >
                  Anuluj
                </button>
              </div>
            </form>
          )}

          {/* Rewards list */}
          {rewardsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-meso-red-500 animate-spin" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-white/40 text-center py-8">
              Brak nagród lojalnościowych
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) =>
                editingId === reward.id ? (
                  /* Inline edit form */
                  <form
                    key={reward.id}
                    onSubmit={handleSaveEdit}
                    className="p-4 bg-meso-dark-900 rounded-xl border border-meso-red-500/30 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Nazwa</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, name: e.target.value }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Koszt (punkty)</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.points_cost}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              points_cost: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Typ nagrody</label>
                        <select
                          value={editForm.reward_type}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              reward_type: e.target.value as RewardType,
                            }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        >
                          {REWARD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Wartość zniżki (PLN)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.discount_value}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              discount_value: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Ikona</label>
                        <input
                          type="text"
                          value={editForm.icon}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, icon: e.target.value }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Kolejność</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.sort_order}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              sort_order: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Min. tier</label>
                        <select
                          value={editForm.min_tier || 'bronze'}
                          onChange={(e) => setEditForm((p) => ({ ...p, min_tier: e.target.value as TierType }))}
                          className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                        >
                          <option value="bronze">Bronze (wszyscy)</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-white/60">Opis</label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, description: e.target.value }))
                        }
                        className="w-full h-12 px-4 text-white bg-meso-dark-900 border border-white/10 rounded-xl focus:border-meso-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSaving}
                        className="bg-meso-red-500 hover:bg-meso-red-600 disabled:opacity-50 text-white font-bold h-10 px-6 rounded-xl transition-colors flex items-center gap-2 text-sm"
                      >
                        {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Zapisz
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-white/10 hover:bg-white/20 text-white font-medium h-10 px-6 rounded-xl transition-colors text-sm"
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Reward row */
                  <div
                    key={reward.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      reward.is_active
                        ? 'bg-meso-dark-900 border-white/5'
                        : 'bg-meso-dark-900/50 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">{reward.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                          {reward.points_cost} pkt
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                          {rewardTypeLabel(reward.reward_type)}
                        </span>
                        {!reward.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                            Nieaktywna
                          </span>
                        )}
                        {reward.min_tier && reward.min_tier !== 'bronze' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            reward.min_tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-400/20 text-gray-300'
                          }`}>
                            {reward.min_tier === 'gold' ? 'Gold' : 'Silver'}
                          </span>
                        )}
                      </div>
                      {reward.description && (
                        <p className="text-sm text-white/40 mt-1 truncate">
                          {reward.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => startEdit(reward)}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {reward.is_active && (
                        <button
                          onClick={() => handleDeleteReward(reward.id)}
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
    </div>
  )
}
