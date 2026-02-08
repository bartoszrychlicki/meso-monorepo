'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  MapPin,
  Receipt,
  Globe,
  Plug,
  Save,
  Bell,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    // General
    companyName: 'MESO Restaurant',
    companyAddress: 'ul. Przykładowa 123, 00-001 Warszawa',
    companyNIP: '1234567890',
    defaultTaxRate: 8,
    currency: 'PLN',
    timezone: 'Europe/Warsaw',

    // Appearance
    theme: 'system',
    language: 'pl',

    // Notifications
    orderNotifications: true,
    lowStockAlerts: true,
    emailNotifications: true,

    // Receipt
    receiptHeader: 'MESO Restaurant\nul. Przykładowa 123\n00-001 Warszawa',
    receiptFooter: 'Dziękujemy za zamówienie!\nZapraszamy ponownie',
    printAutomatically: true,
  });

  const handleSave = () => {
    // TODO: Integrate with backend
    toast.success('Ustawienia zapisane pomyślnie');
  };

  useEffect(() => {
    if (currentTheme) {
      setSettings((prev) => ({ ...prev, theme: currentTheme }));
    }
  }, [currentTheme]);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      setTheme(value);
    }
  };

  return (
    <div className="space-y-6" data-page="settings">
      <PageHeader
        title="Ustawienia"
        description="Zarządzaj ustawieniami systemu i konfiguruj swój punkt sprzedaży"
        actions={
          <Button onClick={handleSave} data-action="save-settings">
            <Save className="mr-2 h-4 w-4" />
            Zapisz zmiany
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Ogólne</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Lokalizacje</span>
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Paragony</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Wygląd</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integracje</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informacje o firmie</CardTitle>
              <CardDescription>
                Podstawowe dane firmy używane w systemie i na paragonach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nazwa firmy</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    data-field="company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyNIP">NIP</Label>
                  <Input
                    id="companyNIP"
                    value={settings.companyNIP}
                    onChange={(e) => updateSetting('companyNIP', e.target.value)}
                    data-field="company-nip"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Adres</Label>
                <Input
                  id="companyAddress"
                  value={settings.companyAddress}
                  onChange={(e) => updateSetting('companyAddress', e.target.value)}
                  data-field="company-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ustawienia regionalne i podatkowe</CardTitle>
              <CardDescription>
                Waluta, strefa czasowa i domyślna stawka VAT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Waluta</Label>
                  <Select value={settings.currency} onValueChange={(v) => updateSetting('currency', v)}>
                    <SelectTrigger id="currency" data-field="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">PLN (zł)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Strefa czasowa</Label>
                  <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                    <SelectTrigger id="timezone" data-field="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Warsaw">Europa/Warszawa (UTC+1)</SelectItem>
                      <SelectItem value="Europe/London">Europa/Londyn (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">Ameryka/Nowy Jork (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Domyślna stawka VAT (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.defaultTaxRate}
                    onChange={(e) => updateSetting('defaultTaxRate', parseFloat(e.target.value))}
                    data-field="default-tax-rate"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Powiadomienia</CardTitle>
              <CardDescription>
                Konfiguruj powiadomienia o ważnych zdarzeniach w systemie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="orderNotifications">Powiadomienia o zamówieniach</Label>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj powiadomienia o nowych zamówieniach
                  </p>
                </div>
                <Switch
                  id="orderNotifications"
                  checked={settings.orderNotifications}
                  onCheckedChange={(checked) => updateSetting('orderNotifications', checked)}
                  data-field="order-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lowStockAlerts">Alerty o niskim stanie magazynowym</Label>
                  <p className="text-sm text-muted-foreground">
                    Powiadomienia gdy stan magazynowy jest niski
                  </p>
                </div>
                <Switch
                  id="lowStockAlerts"
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) => updateSetting('lowStockAlerts', checked)}
                  data-field="low-stock-alerts"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Powiadomienia e-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Wysyłaj podsumowania dzienne na e-mail
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  data-field="email-notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lokalizacje</CardTitle>
              <CardDescription>
                Zarządzaj punktami sprzedaży i magazynami
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium mb-1">Zarządzanie lokalizacjami</p>
                <p>Funkcja dostępna wkrótce - będzie można dodawać i edytować punkty sprzedaży</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt Settings */}
        <TabsContent value="receipt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia paragonów</CardTitle>
              <CardDescription>
                Dostosuj wygląd i treść paragonów fiskalnych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptHeader">Nagłówek paragonu</Label>
                <textarea
                  id="receiptHeader"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.receiptHeader}
                  onChange={(e) => updateSetting('receiptHeader', e.target.value)}
                  data-field="receipt-header"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Stopka paragonu</Label>
                <textarea
                  id="receiptFooter"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.receiptFooter}
                  onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                  data-field="receipt-footer"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="printAutomatically">Automatyczne drukowanie</Label>
                  <p className="text-sm text-muted-foreground">
                    Drukuj paragony automatycznie po zamknięciu zamówienia
                  </p>
                </div>
                <Switch
                  id="printAutomatically"
                  checked={settings.printAutomatically}
                  onCheckedChange={(checked) => updateSetting('printAutomatically', checked)}
                  data-field="print-automatically"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wygląd</CardTitle>
              <CardDescription>
                Dostosuj wygląd aplikacji do swoich preferencji
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme">Motyw</Label>
                  <Select value={settings.theme} onValueChange={(v) => updateSetting('theme', v)}>
                    <SelectTrigger id="theme" data-field="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Jasny</SelectItem>
                      <SelectItem value="dark">Ciemny</SelectItem>
                      <SelectItem value="system">Systemowy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Język</Label>
                  <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                    <SelectTrigger id="language" data-field="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">Polski</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integracje</CardTitle>
              <CardDescription>
                Połącz MESOpos z zewnętrznymi usługami
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Plug className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium mb-1">Integracje zewnętrzne</p>
                <p>Stripe, Przelewy24, SMS API - dostępne wkrótce</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
