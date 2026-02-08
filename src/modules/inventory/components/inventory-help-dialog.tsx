/**
 * Inventory Help Dialog
 *
 * Comprehensive guide for using inventory management features.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  Package,
  Truck,
  Trash2,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
  Edit,
  CheckCircle,
} from 'lucide-react';

interface InventoryHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryHelpDialog({ open, onOpenChange }: InventoryHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Przewodnik po Module Magazynowym
          </DialogTitle>
          <DialogDescription>
            Kompleksowy przewodnik po wszystkich funkcjach zarządzania magazynem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {/* Dashboard Alerts */}
            <AccordionItem value="alerts">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Alerty i Powiadomienia</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      🚫 Partie Krytyczne i Przeterminowane
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Główny dashboard magazynu (pełna szerokość na górze)
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Co pokazuje:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• <Badge variant="destructive" className="text-xs">EXPIRED</Badge> - Partie przeterminowane (natychmiastowe usunięcie!)</li>
                      <li>• <Badge variant="outline" className="text-xs bg-orange-100">CRITICAL</Badge> - Partie krytyczne (użyj w pierwszej kolejności)</li>
                      <li>• Czas do wygaśnięcia z dokładnością do dni/godzin</li>
                      <li>• Ilość pozostała w każdej partii</li>
                    </ul>
                    <p className="text-sm font-semibold mt-2 text-red-700">
                      ⚠️ HACCP: Przeterminowane partie muszą być natychmiast usunięte z magazynu!
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Partie Wygasające
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Dashboard (lewa kolumna)
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Co pokazuje:</strong> Partie wygasające w ciągu 7 dni (domyślnie)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kategorie według pilności: &lt;3 dni (krytyczne), &lt;7 dni (ostrzeżenie), &lt;14 dni (info)
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Niskie Stany Magazynowe
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Dashboard (prawa kolumna)
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Co pokazuje:</strong> Produkty poniżej minimalnego stanu
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Procent minimalnego stanu, ilość zarezerwowana i w transporcie
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stock Operations */}
            <AccordionItem value="stock-operations">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>Operacje na Stanach Magazynowych</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <Minus className="h-4 w-4 text-red-600" />
                      Korekta Stanu (Zwiększ/Zmniejsz)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Tabela stanów magazynowych → kolumna "Akcje"
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Jak użyć:</strong>
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>1. Kliknij przycisk <Plus className="inline h-3 w-3" /> (zwiększ) lub <Minus className="inline h-3 w-3" /> (zmniejsz)</li>
                      <li>2. Wprowadź ilość zmiany</li>
                      <li>3. Podaj powód korekty (np. "Dostawa", "Inwentaryzacja", "Korekta błędu")</li>
                      <li>4. Zatwierdź - stan zostanie zaktualizowany</li>
                    </ol>
                    <p className="text-sm font-semibold mt-2 text-blue-700">
                      💡 Użyj do szybkich korekt po dostawach lub inwentaryzacji
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      Wydanie Towaru (FEFO)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Tabela stanów → przycisk <Truck className="inline h-3 w-3" />
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Co to jest FEFO?</strong> First Expired First Out - automatyczne wydawanie partii
                      według daty ważności (najwcześniej wygasające jako pierwsze)
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Jak użyć:</strong>
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>1. Kliknij przycisk <Truck className="inline h-3 w-3" /> przy produkcie</li>
                      <li>2. Wprowadź ilość do wydania</li>
                      <li>3. Kliknij "Pokaż podgląd FEFO" - zobaczysz które partie zostaną wybrane</li>
                      <li>4. Zatwierdź wydanie - partie automatycznie zmniejszą stan</li>
                    </ol>
                    <p className="text-sm font-semibold mt-2 text-green-700">
                      ✅ Gwarantuje zgodność z HACCP - zawsze najpierw wygasające partie!
                    </p>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      Rejestracja Straty
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Tabela stanów → czerwony przycisk <Trash2 className="inline h-3 w-3" />
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Kiedy używać?</strong> Przy przeterminowaniu, uszkodzeniu, zepsuciu, kradzieży
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Jak użyć:</strong>
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>1. Kliknij czerwony przycisk <Trash2 className="inline h-3 w-3" /></li>
                      <li>2. Wybierz kategorię straty:
                        <ul className="ml-4 mt-1">
                          <li>• 📅 Przeterminowanie</li>
                          <li>• 📦 Uszkodzenie</li>
                          <li>• 🦠 Zepsucie</li>
                          <li>• 🚨 Kradzież</li>
                          <li>• ⚠️ Błąd produkcji</li>
                          <li>• 📝 Inne</li>
                        </ul>
                      </li>
                      <li>3. Podaj ilość straty</li>
                      <li>4. Opisz szczegółowo przyczynę (wymagane dla HACCP)</li>
                      <li>5. System automatycznie obliczy wartość straty</li>
                    </ol>
                    <p className="text-sm font-semibold mt-2 text-red-700">
                      📋 Wszystkie straty są logowane w dzienniku magazynowym
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Batch Management */}
            <AccordionItem value="batches">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Zarządzanie Partiami</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2">
                      Edycja Partii
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Partie magazynowe → kolumna "Akcje" → przycisk "Edytuj"
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Co można zrobić:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Zmienić datę ważności (przydatności)</li>
                      <li>• Oznaczyć partię jako "otwartą"</li>
                      <li>• System automatycznie przeliczy termin ważności po otwarciu</li>
                    </ul>
                    <p className="text-sm font-semibold mt-2 text-purple-700">
                      📦 Po otwarciu produktu system śledzi skrócony termin przydatności
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2">
                      Statusy Partii
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">FRESH</Badge>
                        <span className="text-muted-foreground">Świeża, dużo czasu do wygaśnięcia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-700">WARNING</Badge>
                        <span className="text-muted-foreground">Ostrzeżenie, zbliża się data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-700">CRITICAL</Badge>
                        <span className="text-muted-foreground">Krytyczna, użyj w pierwszej kolejności</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-700">EXPIRED</Badge>
                        <span className="text-muted-foreground">Przeterminowana, natychmiastowe usunięcie!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Transfers */}
            <AccordionItem value="transfers">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Transfery między Magazynami</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2">
                      Przepływ Transferu
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">1. PENDING</Badge>
                        <span className="text-muted-foreground">→ Zlecenie utworzone, czeka na wysyłkę</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">2. IN_TRANSIT</Badge>
                        <span className="text-muted-foreground">→ Towar w drodze</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 text-xs">3. COMPLETED</Badge>
                        <span className="text-muted-foreground">→ Dostarczone i odebrane</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Akcje na Transferach
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Gdzie:</strong> Transfery magazynowe → kolumna "Akcje"
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">🚚 Wyślij (Status: PENDING)</p>
                        <p className="text-sm text-muted-foreground ml-4">
                          Oznacza transfer jako "W drodze", zmniejsza stan w magazynie źródłowym,
                          przenosi ilość do "W transporcie"
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">📦 Odbierz (Status: IN_TRANSIT)</p>
                        <p className="text-sm text-muted-foreground ml-4">
                          Potwierdza odbiór, zwiększa stan w magazynie docelowym,
                          zmniejsza "W transporcie"
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">❌ Anuluj (Status: PENDING lub IN_TRANSIT)</p>
                        <p className="text-sm text-muted-foreground ml-4">
                          Cofa transfer, przywraca stany magazynowe jeśli był już wysłany
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-semibold text-sm mb-2">
                      ⚠️ Ważne Informacje
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Każda akcja wymaga potwierdzenia w dialogu</li>
                      <li>• System pokazuje dokładnie co się stanie z stanami magazynowymi</li>
                      <li>• Po wysłaniu towar jest "W transporcie" - nie dostępny dla magazynu źródłowego</li>
                      <li>• Anulowanie transferu w drodze przywraca stan źródłowy</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Best Practices */}
            <AccordionItem value="best-practices">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Najlepsze Praktyki</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">✅ Codzienne Sprawdzanie</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Sprawdź alerty krytyczne na dashboardzie (rano)</li>
                    <li>• Usuń przeterminowane partie natychmiast</li>
                    <li>• Zaplanuj wykorzystanie partii krytycznych</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">📦 Wydawanie Towaru</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• ZAWSZE używaj funkcji "Wydaj towar (FEFO)" zamiast ręcznej korekty</li>
                    <li>• FEFO automatycznie wybiera właściwe partie</li>
                    <li>• Zgodność z HACCP bez dodatkowej pracy</li>
                  </ul>
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">📋 Dokumentowanie Strat</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Zawsze rejestruj straty przez dedykowaną funkcję</li>
                    <li>• Wybieraj właściwą kategorię (ważne dla raportów)</li>
                    <li>• Opisuj szczegółowo przyczynę (wymóg HACCP)</li>
                  </ul>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">🔄 Transfery</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Wysyłaj transfery tego samego dnia co tworzenie</li>
                    <li>• Odbieraj natychmiast po dostarczeniu (aktualne stany)</li>
                    <li>• Anuluj tylko jeśli naprawdę konieczne</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export help button component for easy integration
export function InventoryHelpButton() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(true)}
        data-action="show-help"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Pomoc
      </Button>
      <InventoryHelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
}
