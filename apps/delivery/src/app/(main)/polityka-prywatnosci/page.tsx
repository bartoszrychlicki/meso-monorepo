'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PolitykaPrywatnosciPage() {
    return (
        <div className="min-h-screen bg-background text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center bg-background/80 backdrop-blur-sm p-4 pb-2 justify-between border-b border-border">
                <div className="flex w-12 items-center justify-start">
                    <Link
                        href="/"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                </div>
                <h1
                    className="text-white text-lg font-bold leading-tight tracking-widest flex-1 text-center uppercase"
                    style={{ textShadow: '0 0 5px hsl(330 100% 50% / 0.5)' }}
                >
                    Prywatność
                </h1>
                <div className="flex w-12 items-center justify-end">
                    <Shield className="w-6 h-6 text-primary" />
                </div>
            </header>

            {/* Content */}
            <main className="px-4 py-6 pb-24 max-w-3xl mx-auto">
                <article className="prose prose-invert prose-sm max-w-none">
                    <h1 className="text-2xl font-bold text-white mb-6">Polityka Prywatności MESO Food</h1>

                    <p className="text-white/60 text-sm mb-8">
                        Obowiązuje od: 6 lutego 2026 r.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§1. Administrator danych osobowych</h2>
                        <div className="text-white/80">
                            <p className="mb-4">Administratorem Twoich danych osobowych jest:</p>
                            <div className="p-4 bg-card rounded-lg">
                                <p><strong>Rychlicki Holding Sp. z o.o.</strong></p>
                                <p>ul. Leśna 8/8, 80-322 Gdańsk</p>
                                <p>NIP: 9571130261</p>
                                <p>Email: kontakt@mesofood.pl</p>
                                <p>Telefon: +48 508 118 783</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§2. Jakie dane zbieramy?</h2>
                        <ul className="list-disc list-inside space-y-2 text-white/80">
                            <li><strong>Dane identyfikacyjne:</strong> imię, nazwisko</li>
                            <li><strong>Dane kontaktowe:</strong> adres email, numer telefonu</li>
                            <li><strong>Dane adresowe:</strong> adres dostawy (ulica, numer, kod pocztowy, miasto)</li>
                            <li><strong>Dane transakcyjne:</strong> historia zamówień, metody płatności</li>
                            <li><strong>Dane techniczne:</strong> adres IP, informacje o urządzeniu, pliki cookies</li>
                            <li><strong>Dane programu lojalnościowego:</strong> liczba punktów, poziom członkostwa</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§3. Cele i podstawy prawne przetwarzania</h2>
                        <div className="space-y-4 text-white/80">
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Realizacja zamówień</h3>
                                <p className="text-sm">Podstawa: wykonanie umowy (art. 6 ust. 1 lit. b RODO)</p>
                                <p className="text-sm mt-1">Dane: imię, nazwisko, adres, telefon, email</p>
                            </div>
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Obsługa płatności</h3>
                                <p className="text-sm">Podstawa: wykonanie umowy (art. 6 ust. 1 lit. b RODO)</p>
                                <p className="text-sm mt-1">Dane przekazywane do operatora płatności PayPro SA (Przelewy24)</p>
                            </div>
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Prowadzenie konta użytkownika</h3>
                                <p className="text-sm">Podstawa: wykonanie umowy (art. 6 ust. 1 lit. b RODO)</p>
                            </div>
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Program lojalnościowy MESO Club</h3>
                                <p className="text-sm">Podstawa: zgoda (art. 6 ust. 1 lit. a RODO)</p>
                            </div>
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Marketing bezpośredni</h3>
                                <p className="text-sm">Podstawa: zgoda (art. 6 ust. 1 lit. a RODO) lub uzasadniony interes (art. 6 ust. 1 lit. f RODO)</p>
                            </div>
                            <div className="p-4 bg-card rounded-lg">
                                <h3 className="font-semibold text-white mb-2">Rozpatrywanie reklamacji</h3>
                                <p className="text-sm">Podstawa: obowiązek prawny (art. 6 ust. 1 lit. c RODO)</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§4. Odbiorcy danych</h2>
                        <p className="text-white/80 mb-4">Twoje dane mogą być przekazywane:</p>
                        <ul className="list-disc list-inside space-y-2 text-white/80">
                            <li><strong>PayPro SA (Przelewy24)</strong> – obsługa płatności elektronicznych</li>
                            <li><strong>Kurierzy</strong> – realizacja dostaw</li>
                            <li><strong>Supabase Inc.</strong> – hosting i przechowywanie danych</li>
                            <li><strong>Organy państwowe</strong> – na żądanie uprawnionych organów</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§5. Okres przechowywania danych</h2>
                        <ul className="list-disc list-inside space-y-2 text-white/80">
                            <li><strong>Dane zamówień:</strong> 5 lat (wymogi podatkowe)</li>
                            <li><strong>Dane konta:</strong> do czasu usunięcia konta</li>
                            <li><strong>Dane marketingowe:</strong> do cofnięcia zgody</li>
                            <li><strong>Dane reklamacyjne:</strong> 3 lata od rozpatrzenia</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§6. Twoje prawa</h2>
                        <p className="text-white/80 mb-4">Zgodnie z RODO przysługują Ci następujące prawa:</p>
                        <ul className="list-disc list-inside space-y-2 text-white/80">
                            <li><strong>Prawo dostępu</strong> – możesz uzyskać informację o przetwarzanych danych</li>
                            <li><strong>Prawo do sprostowania</strong> – możesz poprawić nieprawidłowe dane</li>
                            <li><strong>Prawo do usunięcia</strong> – możesz żądać usunięcia danych (&quot;prawo do bycia zapomnianym&quot;)</li>
                            <li><strong>Prawo do ograniczenia przetwarzania</strong> – możesz ograniczyć sposób wykorzystania danych</li>
                            <li><strong>Prawo do przenoszenia danych</strong> – możesz otrzymać dane w formacie elektronicznym</li>
                            <li><strong>Prawo do sprzeciwu</strong> – możesz sprzeciwić się przetwarzaniu w celach marketingowych</li>
                            <li><strong>Prawo do cofnięcia zgody</strong> – w każdej chwili, bez wpływu na zgodność z prawem wcześniejszego przetwarzania</li>
                        </ul>
                        <p className="text-white/80 mt-4">
                            Aby skorzystać z tych praw, skontaktuj się z nami: <a href="mailto:kontakt@mesofood.pl" className="text-primary hover:underline">kontakt@mesofood.pl</a>
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§7. Prawo do skargi</h2>
                        <p className="text-white/80">
                            Masz prawo wnieść skargę do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">uodo.gov.pl</a>).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§8. Pliki cookies</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Strona wykorzystuje pliki cookies (ciasteczka) do prawidłowego funkcjonowania.</li>
                            <li>Rodzaje cookies:
                                <ul className="list-disc list-inside ml-4 mt-2">
                                    <li><strong>Niezbędne</strong> – wymagane do działania strony (sesja, koszyk)</li>
                                    <li><strong>Funkcjonalne</strong> – zapamiętywanie preferencji użytkownika</li>
                                    <li><strong>Analityczne</strong> – analiza ruchu na stronie</li>
                                </ul>
                            </li>
                            <li>Możesz zarządzać cookies w ustawieniach przeglądarki.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§9. Bezpieczeństwo danych</h2>
                        <p className="text-white/80">
                            Stosujemy odpowiednie środki techniczne i organizacyjne, w tym szyfrowanie SSL, aby chronić Twoje dane przed nieuprawnionym dostępem, utratą lub zniszczeniem.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§10. Zmiany w Polityce Prywatności</h2>
                        <p className="text-white/80">
                            Zastrzegamy sobie prawo do zmiany niniejszej Polityki Prywatności. O istotnych zmianach poinformujemy za pośrednictwem strony internetowej lub wiadomości email.
                        </p>
                    </section>

                    <div className="mt-10 p-4 bg-card rounded-lg">
                        <p className="text-white/60 text-sm">
                            <strong>Rychlicki Holding Sp. z o.o.</strong><br />
                            ul. Leśna 8/8, 80-322 Gdańsk<br />
                            NIP: 9571130261<br />
                            kontakt@mesofood.pl | +48 508 118 783
                        </p>
                    </div>
                </article>
            </main>
        </div>
    )
}
