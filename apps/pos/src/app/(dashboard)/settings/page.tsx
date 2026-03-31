'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Plug,
  Save,
  Palette,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiKeysManager } from '@/modules/settings/components/api-keys-manager';
import { LocationList } from '@/modules/settings/components/location-list';
import { ReceiptDefaultsCard, KdsDefaultsCard } from '@/modules/settings/components/global-defaults-forms';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { createClient } from '@/lib/supabase/client';
import { usePosI18n } from '@/lib/i18n/provider';
import { useUserStore } from '@/modules/users/store';

function SettingsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'general';
  const { theme: currentTheme, setTheme } = useTheme();
  const { t, setLocale } = usePosI18n();
  const { currentUser, setCurrentUserLocale } = useUserStore();
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
  });

  const handleSave = async () => {
    if (currentUser) {
      const supabase = createClient();
      const nextLocale = settings.language as 'pl' | 'en';
      const { error } = await supabase
        .from('users_users')
        .update({ ui_language: nextLocale })
        .eq('id', currentUser.id);

      if (error) {
        toast.error(t('settings.saveError'));
        return;
      }

      setCurrentUserLocale(nextLocale);
      setLocale(nextLocale);
    }

    toast.success(t('settings.saved'));
  };

  useEffect(() => {
    if (currentTheme) {
      setSettings((prev) => ({ ...prev, theme: currentTheme }));
    }
  }, [currentTheme]);

  useEffect(() => {
    if (currentUser?.ui_language) {
      setSettings((prev) => ({ ...prev, language: currentUser.ui_language ?? 'pl' }));
    }
  }, [currentUser?.ui_language]);

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme') {
      setTheme(value as string);
    }
  };

  return (
    <div className="space-y-6" data-page="settings">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          <Button onClick={handleSave} data-action="save-settings">
            <Save className="mr-2 h-4 w-4" />
            {t('settings.save')}
          </Button>
        }
      />

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.locations')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.appearance')}</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.apiKeys')}</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.integrations')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.companyInfo.title')}</CardTitle>
              <CardDescription>
                {t('settings.companyInfo.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('settings.companyName')}</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    data-field="company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyNIP">{t('settings.companyNip')}</Label>
                  <Input
                    id="companyNIP"
                    value={settings.companyNIP}
                    onChange={(e) => updateSetting('companyNIP', e.target.value)}
                    data-field="company-nip"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">{t('settings.companyAddress')}</Label>
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
              <CardTitle>{t('settings.region.title')}</CardTitle>
              <CardDescription>
                {t('settings.region.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('settings.currency')}</Label>
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
                  <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                  <Select value={settings.timezone} onValueChange={(v) => updateSetting('timezone', v)}>
                    <SelectTrigger id="timezone" data-field="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Warsaw">{t('settings.timezone.warsaw')}</SelectItem>
                      <SelectItem value="Europe/London">{t('settings.timezone.london')}</SelectItem>
                      <SelectItem value="America/New_York">{t('settings.timezone.newYork')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">{t('settings.defaultTaxRate')}</Label>
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
              <CardTitle>{t('settings.notifications.title')}</CardTitle>
              <CardDescription>
                {t('settings.notifications.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="orderNotifications">{t('settings.notifications.orders.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.orders.help')}
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
                  <Label htmlFor="lowStockAlerts">{t('settings.notifications.stock.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.stock.help')}
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
                  <Label htmlFor="emailNotifications">{t('settings.notifications.email.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.notifications.email.help')}
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

          <ReceiptDefaultsCard />
          <KdsDefaultsCard />
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations" className="space-y-4">
          <LocationList />
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance.title')}</CardTitle>
              <CardDescription>
                {t('settings.appearance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="theme">{t('settings.theme')}</Label>
                  <Select value={settings.theme} onValueChange={(v) => updateSetting('theme', v)}>
                    <SelectTrigger id="theme" data-field="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.theme.light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.theme.dark')}</SelectItem>
                      <SelectItem value="system">{t('settings.theme.system')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t('settings.language')}</Label>
                  <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                    <SelectTrigger id="language" data-field="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">{t('settings.language.pl')}</SelectItem>
                      <SelectItem value="en">{t('settings.language.en')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys" className="space-y-4">
          <ApiKeysManager />
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.integrations.title')}</CardTitle>
              <CardDescription>
                {t('settings.integrations.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Plug className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium mb-1">{t('settings.integrations.emptyTitle')}</p>
                <p>{t('settings.integrations.emptyBody')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <SettingsContent />
    </Suspense>
  );
}
