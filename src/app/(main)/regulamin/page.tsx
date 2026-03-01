'use client'

import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export default function RegulaminPage() {
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
                    Regulamin
                </h1>
                <div className="flex w-12 items-center justify-end">
                    <FileText className="w-6 h-6 text-primary" />
                </div>
            </header>

            {/* Content */}
            <main className="px-4 py-6 pb-24 max-w-3xl mx-auto">
                <article className="prose prose-invert prose-sm max-w-none">
                    <h1 className="text-2xl font-bold text-white mb-6">Regulamin Sklepu Internetowego MESO Food</h1>

                    <p className="text-white/60 text-sm mb-8">
                        Obowiązuje od: 6 lutego 2026 r.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§1. Postanowienia ogólne</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Sklep internetowy MESO Food dostępny pod adresem <strong>order.mesofood.pl</strong> prowadzony jest przez:
                                <div className="mt-2 ml-4 p-4 bg-card rounded-lg">
                                    <p><strong>Rychlicki Holding Sp. z o.o.</strong></p>
                                    <p>ul. Leśna 8/8, 80-322 Gdańsk</p>
                                    <p>NIP: 9571130261</p>
                                    <p>Email: kontakt@mesofood.pl</p>
                                    <p>Telefon: +48 508 118 783</p>
                                </div>
                            </li>
                            <li>Regulamin określa zasady korzystania ze Sklepu internetowego, składania zamówień, dostawy, płatności oraz reklamacji.</li>
                            <li>Klient zobowiązany jest do zapoznania się z Regulaminem przed złożeniem zamówienia.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§2. Definicje</h2>
                        <ul className="list-disc list-inside space-y-2 text-white/80">
                            <li><strong>Sprzedawca</strong> – Rychlicki Holding Sp. z o.o.</li>
                            <li><strong>Klient</strong> – osoba fizyczna, prawna lub jednostka organizacyjna składająca zamówienie.</li>
                            <li><strong>Sklep</strong> – serwis internetowy order.mesofood.pl.</li>
                            <li><strong>Zamówienie</strong> – oświadczenie woli Klienta zmierzające do zawarcia umowy sprzedaży.</li>
                            <li><strong>Produkt</strong> – posiłki i napoje oferowane w Sklepie.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§3. Składanie zamówień</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Zamówienia można składać 24 godziny na dobę, 7 dni w tygodniu.</li>
                            <li>Realizacja zamówień odbywa się w godzinach pracy lokalu: 11:00-22:00.</li>
                            <li>Minimalna wartość zamówienia wynosi <strong>35 PLN</strong>.</li>
                            <li>Przed złożeniem zamówienia Klient zobowiązany jest zaakceptować niniejszy Regulamin oraz Politykę Prywatności.</li>
                            <li>Złożenie zamówienia stanowi ofertę zakupu Produktów. Umowa sprzedaży zostaje zawarta z chwilą potwierdzenia przyjęcia zamówienia przez Sprzedawcę.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§4. Ceny i płatności</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Ceny produktów podane w Sklepie są cenami brutto (zawierają podatek VAT).</li>
                            <li>Całkowita cena zamówienia obejmuje cenę produktów oraz koszt dostawy (jeśli dotyczy).</li>
                            <li>Dostępne metody płatności:
                                <ul className="list-disc list-inside ml-4 mt-2">
                                    <li>BLIK</li>
                                    <li>Karta płatnicza (Visa, Mastercard)</li>
                                    <li>Google Pay</li>
                                    <li>Gotówka przy odbiorze</li>
                                </ul>
                            </li>
                            <li>Płatności elektroniczne obsługiwane są przez:
                                <div className="mt-2 ml-4 p-4 bg-card rounded-lg text-sm">
                                    <p><strong>PayPro SA</strong> (Przelewy24)</p>
                                    <p>ul. Pastelowa 8, 60-198 Poznań</p>
                                    <p>KRS: 0000347935, NIP: 7792369887, REGON: 301345068</p>
                                </div>
                            </li>
                            <li className="mt-2">
                                <strong>Operatorem kart płatniczych</strong> jest PayPro SA Agent Rozliczeniowy, ul. Pastelowa 8, 60-198 Poznań, wpisany do Rejestru Przedsiębiorców Krajowego Rejestru Sądowego prowadzonego przez Sąd Rejonowy Poznań Nowe Miasto i Wilda w Poznaniu, VIII Wydział Gospodarczy Krajowego Rejestru Sądowego pod numerem KRS 0000347935, NIP 7792369887, REGON 301345068.
                            </li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§5. Dostawa</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Dostawa realizowana jest na terenie Gdańska w promieniu <strong>5 km</strong> od lokalu.</li>
                            <li>Koszt dostawy wynosi <strong>7,99 PLN</strong>.</li>
                            <li>Szacowany czas dostawy: <strong>30-45 minut</strong>.</li>
                            <li>Możliwy jest również odbiór osobisty w lokalu MESO Food.</li>
                            <li>Dostawa realizowana jest pod wskazany przez Klienta adres. Klient zobowiązany jest do podania prawidłowych danych adresowych.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§6. Prawo odstąpienia od umowy</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Zgodnie z art. 38 pkt 4 ustawy o prawach konsumenta, prawo odstąpienia od umowy nie przysługuje w przypadku umowy, w której przedmiotem świadczenia jest rzecz ulegająca szybkiemu zepsuciu lub mająca krótki termin przydatności do użycia.</li>
                            <li>Ze względu na charakter produktów (gotowe posiłki), Klient nie ma prawa do odstąpienia od umowy po rozpoczęciu przygotowania zamówienia.</li>
                            <li>Klient może anulować zamówienie przed jego potwierdzeniem przez Sprzedawcę, kontaktując się pod adres: kontakt@mesofood.pl lub telefonicznie: +48 508 118 783.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§7. Reklamacje</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Reklamacje można składać:
                                <ul className="list-disc list-inside ml-4 mt-2">
                                    <li>mailowo: kontakt@mesofood.pl</li>
                                    <li>telefonicznie: +48 508 118 783</li>
                                </ul>
                            </li>
                            <li>Reklamacja powinna zawierać: numer zamówienia, opis problemu, żądanie Klienta.</li>
                            <li>Sprzedawca rozpatrzy reklamację w terminie 14 dni od daty jej otrzymania.</li>
                            <li>W przypadku uznania reklamacji, Sprzedawca zwróci należność lub zrealizuje zamówienie ponownie.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§8. Program lojalnościowy MESO Club</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Uczestnictwo w programie MESO Club jest dobrowolne i bezpłatne.</li>
                            <li>Zasady naliczania punktów:
                                <ul className="list-disc list-inside ml-4 mt-2">
                                    <li>1 PLN wydany = 1 punkt</li>
                                    <li>Bonus za rejestrację: 50 punktów</li>
                                    <li>Pierwsze zamówienie: 50 punktów</li>
                                    <li>Polecenie znajomego: 100 punktów</li>
                                </ul>
                            </li>
                            <li>Punkty można wymieniać na nagrody zgodnie z aktualnym cennikiem dostępnym w aplikacji.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§9. Dane osobowe</h2>
                        <p className="text-white/80">
                            Administratorem danych osobowych jest Rychlicki Holding Sp. z o.o. Szczegóły dotyczące przetwarzania danych osobowych zawarte są w <Link href="/polityka-prywatnosci" className="text-primary hover:underline">Polityce Prywatności</Link>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">§10. Postanowienia końcowe</h2>
                        <ol className="list-decimal list-inside space-y-2 text-white/80">
                            <li>Sprzedawca zastrzega sobie prawo do zmiany Regulaminu. Zmiany wchodzą w życie z dniem publikacji.</li>
                            <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego.</li>
                            <li>Wszelkie spory będą rozstrzygane przez właściwy sąd powszechny.</li>
                        </ol>
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
