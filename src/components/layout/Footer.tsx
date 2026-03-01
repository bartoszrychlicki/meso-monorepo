'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook } from 'lucide-react'

// TikTok icon (not in lucide-react)
const TikTok = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
)

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-background border-t border-white/10 py-6 px-4 mt-auto">
            <div className="max-w-6xl mx-auto">
                {/* Payment Methods */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <span className="text-white/40 text-xs">Akceptujemy:</span>
                    <div className="flex items-center gap-3">
                        {/* BLIK */}
                        <div className="bg-white rounded px-2 py-1">
                            <span className="text-black font-bold text-sm">BLIK</span>
                        </div>
                        {/* Visa */}
                        <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-7">
                            <svg viewBox="0 0 48 16" className="h-4 w-auto">
                                <path fill="#1A1F71" d="M19.5 1l-3.8 14h-3l3.8-14h3zm12.8 9l1.6-4.4.9 4.4h-2.5zm3.4 5h2.8l-2.4-14h-2.6c-.6 0-1.1.3-1.3.9l-4.6 13.1h3.2l.6-1.8h3.9l.4 1.8zm-8.3-4.6c0-3.7-5.1-3.9-5.1-5.5 0-.5.5-1 1.5-1.1.5-.1 1.9-.1 3.5.6l.6-2.9c-.9-.3-2-.6-3.4-.6-3.6 0-6.1 1.9-6.1 4.6 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.2 1.4-1.8 0-2.9-.5-3.7-.9l-.7 3c.8.4 2.4.7 4 .7 3.8 0 6.3-1.9 6.5-4.8zM8.3 1L2.8 15H6l1.1-2.7h5.2L13 15h3.2L12.6 1H8.3zm.9 3l1.9 5.6h-4l2.1-5.6z" />
                            </svg>
                        </div>
                        {/* Mastercard */}
                        <div className="flex items-center justify-center h-7">
                            <svg viewBox="0 0 48 30" className="h-6 w-auto">
                                <circle cx="15" cy="15" r="15" fill="#EB001B" />
                                <circle cx="33" cy="15" r="15" fill="#F79E1B" />
                                <path d="M24 5.8c-2.6 2-4.3 5.2-4.3 8.7s1.7 6.7 4.3 8.7c2.6-2 4.3-5.2 4.3-8.7s-1.7-6.7-4.3-8.7z" fill="#FF5F00" />
                            </svg>
                        </div>
                        {/* Google Pay */}
                        <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-7">
                            <span className="text-gray-700 font-medium text-xs">G Pay</span>
                        </div>
                        {/* Przelewy24 */}
                        <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-7">
                            <span className="text-[#d42027] font-bold text-xs">P24</span>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    <a
                        href="https://www.instagram.com/mesogdansk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-primary hover:bg-primary/10 transition-all"
                        aria-label="Instagram"
                    >
                        <Instagram className="w-5 h-5" />
                    </a>
                    <a
                        href="https://www.facebook.com/RamenGdansk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-primary hover:bg-primary/10 transition-all"
                        aria-label="Facebook"
                    >
                        <Facebook className="w-5 h-5" />
                    </a>
                    <a
                        href="https://www.tiktok.com/@meso.food"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-primary hover:bg-primary/10 transition-all"
                        aria-label="TikTok"
                    >
                        <TikTok className="w-5 h-5" />
                    </a>
                </div>

                {/* Legal Links */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm mb-4">
                    <Link
                        href="/regulamin"
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        Regulamin
                    </Link>
                    <span className="text-white/20">|</span>
                    <Link
                        href="/polityka-prywatnosci"
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        Polityka Prywatności
                    </Link>
                </div>

                {/* Company Info */}
                <div className="text-center text-white/40 text-xs space-y-1">
                    <p>
                        <strong className="text-white/60">MESO FOOD Sp. z o.o.</strong>
                    </p>
                    <p>NIP: 5892109794</p>
                    <p>
                        <a href="mailto:kontakt@mesofood.pl" className="hover:text-white transition-colors">
                            kontakt@mesofood.pl
                        </a>
                        {' | '}
                        <a href="tel:+48508118783" className="hover:text-white transition-colors">
                            +48 508 118 783
                        </a>
                    </p>
                    <p className="pt-2">
                        © {currentYear} MESO Food. Wszelkie prawa zastrzeżone.
                    </p>
                </div>
            </div>
        </footer>
    )
}
