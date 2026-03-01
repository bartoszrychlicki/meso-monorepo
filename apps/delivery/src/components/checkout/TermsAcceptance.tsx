'use client'

import Link from 'next/link'

interface TermsAcceptanceProps {
    accepted: boolean
    onChange: (accepted: boolean) => void
    error?: string
}

export function TermsAcceptance({ accepted, onChange, error }: TermsAcceptanceProps) {
    return (
        <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    data-testid="terms-acceptance"
                    checked={accepted}
                    onChange={(e) => onChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                    Akceptuję{' '}
                    <Link
                        href="/regulamin"
                        target="_blank"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        regulamin
                    </Link>
                    {' '}oraz{' '}
                    <Link
                        href="/polityka-prywatnosci"
                        target="_blank"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        politykę prywatności
                    </Link>
                </span>
            </label>
            {error && (
                <p className="text-sm text-red-500 ml-7">{error}</p>
            )}
        </div>
    )
}
