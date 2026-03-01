'use client'
/* eslint-disable react-hooks/incompatible-library */

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, type ContactFormData } from '@/lib/validators/checkout'
import { Checkbox } from '@/components/ui/checkbox'
import { MessageSquare } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

interface ContactFormProps {
    defaultValues?: Partial<ContactFormData>
    savedPhone?: string
    onSubmit: (data: ContactFormData, savePhone: boolean) => void
}

export function ContactForm({ defaultValues, savedPhone, onSubmit }: ContactFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        control,
        formState: { errors, touchedFields, isSubmitted },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues,
        mode: 'onTouched',
    })

    const currentPhone = watch('phone')
    const [savePhoneChecked, setSavePhoneChecked] = useState(true)

    // Show checkbox only when savedPhone exists AND user typed a different number
    const showSaveCheckbox = !!savedPhone && !!currentPhone && currentPhone !== savedPhone

    const handleFormSubmit = (data: ContactFormData) => {
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

    const showError = (field: keyof ContactFormData) =>
        errors[field] && (touchedFields[field] || isSubmitted)

    const inputClassName = 'w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none'

    return (
        <form id="address-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">Imię</label>
                    <input
                        id="firstName"
                        autoComplete="given-name"
                        {...register('firstName')}
                        placeholder="Jan"
                        aria-invalid={showError('firstName') ? true : undefined}
                        className={inputClassName}
                    />
                    {showError('firstName') && <p className="text-red-400 text-xs">{errors.firstName?.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-xs font-medium text-muted-foreground">Nazwisko</label>
                    <input
                        id="lastName"
                        autoComplete="family-name"
                        {...register('lastName')}
                        placeholder="Kowalski"
                        aria-invalid={showError('lastName') ? true : undefined}
                        className={inputClassName}
                    />
                    {showError('lastName') && <p className="text-red-400 text-xs">{errors.lastName?.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</label>
                <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    placeholder="jan@example.com"
                    aria-invalid={showError('email') ? true : undefined}
                    className={inputClassName}
                />
                {showError('email') && <p className="text-red-400 text-xs">{errors.email?.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                    Numer telefonu
                </label>
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
                <p className="text-muted-foreground text-xs">Na ten numer wyślemy SMS o statusie Twojego zamówienia</p>
                {showError('phone') && <p className="text-red-400 text-xs">{errors.phone?.message}</p>}
            </div>

            {showSaveCheckbox && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="savePhone"
                        checked={savePhoneChecked}
                        onCheckedChange={(checked) => setSavePhoneChecked(checked === true)}
                    />
                    <label htmlFor="savePhone" className="text-muted-foreground text-sm cursor-pointer">
                        Zapisz jako domyślny numer telefonu
                    </label>
                </div>
            )}
        </form>
    )
}
