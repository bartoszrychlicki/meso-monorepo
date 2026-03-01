'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, type AddressFormData } from '@/lib/validators/checkout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

interface AddressFormProps {
    defaultValues?: Partial<AddressFormData>
    savedPhone?: string
    onSubmit: (data: AddressFormData, savePhone: boolean) => void
}

export function AddressForm({ defaultValues, savedPhone, onSubmit }: AddressFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        control,
        formState: { errors, touchedFields, isSubmitted },
    } = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: defaultValues || {
            city: 'Gdańsk', // Default city for this delivery zone
        },
        mode: 'onTouched',
    })

    const currentPhone = watch('phone')
    const [savePhoneChecked, setSavePhoneChecked] = useState(true)

    // Show checkbox only when savedPhone exists AND user typed a different number
    const showSaveCheckbox = !!savedPhone && !!currentPhone && currentPhone !== savedPhone

    const handleFormSubmit = (data: AddressFormData) => {
        let shouldSavePhone: boolean

        if (!savedPhone) {
            // First time - always save
            shouldSavePhone = true
        } else if (data.phone === savedPhone) {
            // Same number - no action needed
            shouldSavePhone = false
        } else {
            // Different number - respect checkbox
            shouldSavePhone = savePhoneChecked
        }

        onSubmit(data, shouldSavePhone)
    }

    const showError = (field: keyof AddressFormData) =>
        errors[field] && (touchedFields[field] || isSubmitted)

    const fieldProps = (field: keyof AddressFormData) => ({
        ...register(field),
        'aria-invalid': showError(field) ? true : undefined,
    })

    return (
        <form id="address-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Imię</Label>
                    <Input id="firstName" {...fieldProps('firstName')} placeholder="Jan" className="bg-card border-white/10" />
                    {showError('firstName') && <p className="text-red-400 text-sm">{errors.firstName?.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Nazwisko</Label>
                    <Input id="lastName" {...fieldProps('lastName')} placeholder="Kowalski" className="bg-card border-white/10" />
                    {showError('lastName') && <p className="text-red-400 text-sm">{errors.lastName?.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...fieldProps('email')} placeholder="jan@example.com" className="bg-card border-white/10" />
                    {showError('email') && <p className="text-red-400 text-sm">{errors.email?.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-accent" />
                        Numer telefonu
                    </Label>
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <PhoneInput
                                id="phone"
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                error={showError('phone') ? errors.phone?.message : undefined}
                            />
                        )}
                    />
                    {showError('phone') && <p className="text-red-400 text-sm">{errors.phone?.message}</p>}
                </div>
            </div>

            <p className="text-white/40 text-xs -mt-2">Na ten numer wyślemy SMS o statusie Twojego zamówienia</p>

            {showSaveCheckbox && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="savePhone"
                        checked={savePhoneChecked}
                        onCheckedChange={(checked) => setSavePhoneChecked(checked === true)}
                    />
                    <label htmlFor="savePhone" className="text-white/60 text-sm cursor-pointer">
                        Zapisz jako domyślny numer telefonu
                    </label>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="street">Ulica</Label>
                <Input id="street" {...fieldProps('street')} placeholder="Długa" className="bg-card border-white/10" />
                {showError('street') && <p className="text-red-400 text-sm">{errors.street?.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="houseNumber">Nr domu</Label>
                    <Input id="houseNumber" {...fieldProps('houseNumber')} placeholder="12A" className="bg-card border-white/10" />
                    {showError('houseNumber') && <p className="text-red-400 text-sm">{errors.houseNumber?.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="apartmentNumber">Nr lokalu</Label>
                    <Input id="apartmentNumber" {...register('apartmentNumber')} placeholder="5" className="bg-card border-white/10" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="postalCode">Kod pocztowy</Label>
                    <Input id="postalCode" {...fieldProps('postalCode')} placeholder="80-001" maxLength={6} className="bg-card border-white/10" />
                    {showError('postalCode') && <p className="text-red-400 text-sm">{errors.postalCode?.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="city">Miasto</Label>
                <Input id="city" {...register('city')} readOnly className="bg-card/50 border-white/5 text-white/50 cursor-not-allowed" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Uwagi dla kuriera (opcjonalne)</Label>
                <Textarea id="notes" {...register('notes')} placeholder="Kod do domofonu, piętro itp." className="bg-card border-white/10" />
            </div>
        </form>
    )
}
