'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, MapPin, Check, Trash2, Edit2, Loader2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { CustomerAddress } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const addressSchema = z.object({
    label: z.string().min(1, 'Nazwa jest wymagana'),
    street: z.string().min(1, 'Ulica jest wymagana'),
    building_number: z.string().min(1, 'Numer budynku jest wymagany'),
    apartment_number: z.string().optional(),
    city: z.string().min(1, 'Miasto jest wymagane'),
    postal_code: z.string().regex(/^\d{2}-\d{3}$/, 'Nieprawidłowy kod pocztowy (format: XX-XXX)'),
    notes: z.string().optional(),
    is_default: z.boolean(),
})

type AddressFormData = z.infer<typeof addressSchema>

export default function AddressesPage() {
    const { user, isLoading: authLoading } = useAuth()
    const [addresses, setAddresses] = useState<CustomerAddress[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
    const [savingAddress, setSavingAddress] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            label: '',
            street: '',
            building_number: '',
            apartment_number: '',
            city: '',
            postal_code: '',
            notes: '',
            is_default: false,
        },
    })

    const fetchAddresses = async () => {
        if (!user?.id) return

        const supabase = createClient()
        const { data, error } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching addresses:', error)
            toast.error('Nie udało się pobrać adresów')
        } else {
            setAddresses(data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (!authLoading && user?.id) {
            fetchAddresses() // eslint-disable-line react-hooks/set-state-in-effect
        } else if (!authLoading) {
            setIsLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading])

    const handleEdit = (address: CustomerAddress) => {
        setEditingAddress(address)
        form.reset({
            label: address.label,
            street: address.street,
            building_number: address.building_number,
            apartment_number: address.apartment_number || '',
            city: address.city,
            postal_code: address.postal_code,
            notes: address.notes || '',
            is_default: address.is_default,
        })
        setShowForm(true)
    }

    const handleAddNew = () => {
        setEditingAddress(null)
        form.reset({
            label: addresses.length === 0 ? 'Dom' : '',
            street: '',
            building_number: '',
            apartment_number: '',
            city: '',
            postal_code: '',
            notes: '',
            is_default: addresses.length === 0,
        })
        setShowForm(true)
    }

    const handleCancel = () => {
        setShowForm(false)
        setEditingAddress(null)
        form.reset()
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        const supabase = createClient()

        const { error } = await supabase
            .from('customer_addresses')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting address:', error)
            toast.error('Nie udało się usunąć adresu')
        } else {
            toast.success('Adres został usunięty')
            await fetchAddresses()
        }
        setDeletingId(null)
    }

    const handleSetDefault = async (id: string) => {
        const supabase = createClient()

        // First, unset all defaults
        await supabase
            .from('customer_addresses')
            .update({ is_default: false })
            .eq('customer_id', user?.id)

        // Then set the new default
        const { error } = await supabase
            .from('customer_addresses')
            .update({ is_default: true })
            .eq('id', id)

        if (error) {
            console.error('Error setting default:', error)
            toast.error('Nie udało się ustawić domyślnego adresu')
        } else {
            toast.success('Ustawiono jako domyślny adres')
            await fetchAddresses()
        }
    }

    const onSubmit = async (data: AddressFormData) => {
        if (!user?.id) return

        setSavingAddress(true)
        const supabase = createClient()

        // If setting as default, unset other defaults first
        if (data.is_default) {
            await supabase
                .from('customer_addresses')
                .update({ is_default: false })
                .eq('customer_id', user.id)
        }

        if (editingAddress) {
            // Update existing address
            const { error } = await supabase
                .from('customer_addresses')
                .update({
                    ...data,
                    apartment_number: data.apartment_number || null,
                    notes: data.notes || null,
                })
                .eq('id', editingAddress.id)

            if (error) {
                console.error('Error updating address:', error)
                toast.error('Nie udało się zaktualizować adresu')
            } else {
                toast.success('Adres został zaktualizowany')
                setShowForm(false)
                setEditingAddress(null)
                await fetchAddresses()
            }
        } else {
            // Create new address
            const { error } = await supabase
                .from('customer_addresses')
                .insert({
                    customer_id: user.id,
                    ...data,
                    apartment_number: data.apartment_number || null,
                    notes: data.notes || null,
                })

            if (error) {
                console.error('Error creating address:', error)
                toast.error('Nie udało się dodać adresu')
            } else {
                toast.success('Adres został dodany')
                setShowForm(false)
                form.reset()
                await fetchAddresses()
            }
        }

        setSavingAddress(false)
    }

    if (authLoading || isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            {/* Back */}
            <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Profil
            </Link>

            <div className="flex items-center justify-between">
                <h1 className="font-display text-xl font-bold">Adresy dostawy</h1>
                {!showForm && (
                    <Button
                        onClick={handleAddNew}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Dodaj
                    </Button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 bg-card/50 rounded-xl p-5 border border-white/5">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        {editingAddress ? 'Edytuj adres' : 'Nowy adres'}
                    </h2>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Nazwa adresu</label>
                        <Input
                            {...form.register('label')}
                            placeholder="np. Dom, Praca, Biuro"
                            className="bg-background border-white/10 text-white"
                        />
                        {form.formState.errors.label && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.label.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-sm text-white/60 mb-1">Ulica</label>
                            <Input
                                {...form.register('street')}
                                placeholder="np. Długa"
                                className="bg-background border-white/10 text-white"
                            />
                            {form.formState.errors.street && (
                                <p className="text-red-500 text-xs mt-1">{form.formState.errors.street.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Nr budynku</label>
                            <Input
                                {...form.register('building_number')}
                                placeholder="15"
                                className="bg-background border-white/10 text-white"
                            />
                            {form.formState.errors.building_number && (
                                <p className="text-red-500 text-xs mt-1">{form.formState.errors.building_number.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Nr mieszkania (opcjonalne)</label>
                            <Input
                                {...form.register('apartment_number')}
                                placeholder="np. 5"
                                className="bg-background border-white/10 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Kod pocztowy</label>
                            <Input
                                {...form.register('postal_code')}
                                placeholder="80-001"
                                className="bg-background border-white/10 text-white"
                            />
                            {form.formState.errors.postal_code && (
                                <p className="text-red-500 text-xs mt-1">{form.formState.errors.postal_code.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Miasto</label>
                        <Input
                            {...form.register('city')}
                            placeholder="Gdańsk"
                            className="bg-background border-white/10 text-white"
                        />
                        {form.formState.errors.city && (
                            <p className="text-red-500 text-xs mt-1">{form.formState.errors.city.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Notatki dla kuriera (opcjonalne)</label>
                        <Input
                            {...form.register('notes')}
                            placeholder="np. Kod do domofonu: 1234"
                            className="bg-background border-white/10 text-white"
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            {...form.register('is_default')}
                            className="w-5 h-5 rounded border-white/20 bg-background text-primary focus:ring-ring"
                        />
                        <span className="text-white/80">Ustaw jako domyślny adres</span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                        >
                            Anuluj
                        </Button>
                        <Button
                            type="submit"
                            disabled={savingAddress}
                            className="flex-1 bg-primary hover:bg-primary/90"
                        >
                            {savingAddress ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : editingAddress ? (
                                'Zapisz zmiany'
                            ) : (
                                'Dodaj adres'
                            )}
                        </Button>
                    </div>
                </form>
            )}

            {/* Address List */}
            {!showForm && (
                <>
                    {addresses.length === 0 ? (
                        <div className="bg-card/50 rounded-xl p-8 border border-white/5 text-center">
                            <MapPin className="w-12 h-12 text-white/30 mx-auto mb-4" />
                            <p className="text-white/60 mb-4">Nie masz jeszcze żadnych zapisanych adresów</p>
                            <Button
                                onClick={handleAddNew}
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Dodaj pierwszy adres
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map((address) => (
                                <div
                                    key={address.id}
                                    className={cn(
                                        'bg-card/50 rounded-xl p-4 border transition-colors',
                                        address.is_default ? 'border-primary/50' : 'border-white/5'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                            address.is_default ? 'bg-primary/20' : 'bg-white/5'
                                        )}>
                                            <Home className={cn(
                                                'w-5 h-5',
                                                address.is_default ? 'text-primary' : 'text-white/40'
                                            )} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-white">{address.label}</span>
                                                {address.is_default && (
                                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                                        Domyślny
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/60">
                                                {address.street} {address.building_number}
                                                {address.apartment_number && `/${address.apartment_number}`}
                                            </p>
                                            <p className="text-sm text-white/60">
                                                {address.postal_code} {address.city}
                                            </p>
                                            {address.notes && (
                                                <p className="text-xs text-white/40 mt-1 italic">
                                                    {address.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                        {!address.is_default && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetDefault(address.id)}
                                                className="text-white/50 hover:text-white text-xs"
                                            >
                                                <Check className="w-3 h-3 mr-1" />
                                                Ustaw domyślny
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(address)}
                                            className="text-white/50 hover:text-white text-xs"
                                        >
                                            <Edit2 className="w-3 h-3 mr-1" />
                                            Edytuj
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(address.id)}
                                            disabled={deletingId === address.id}
                                            className="text-red-400/70 hover:text-red-400 text-xs ml-auto"
                                        >
                                            {deletingId === address.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Usuń
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
