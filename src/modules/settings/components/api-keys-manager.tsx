'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ALL_API_KEY_PERMISSIONS,
  API_KEY_PERMISSION_LABELS,
  type ApiKeyPermission,
} from '@/types/api-key';
import { formatDateTime } from '@/lib/utils';

interface ApiKeyDisplay {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiKeyPermission[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<ApiKeyPermission[]>([]);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/api-keys');
      const json = await res.json();
      if (json.success) {
        setApiKeys(json.data);
      }
    } catch {
      toast.error('Nie udało się załadować kluczy API');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Podaj nazwę klucza');
      return;
    }
    if (newKeyPermissions.length === 0) {
      toast.error('Wybierz przynajmniej jedno uprawnienie');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreatedRawKey(json.data.raw_key);
        await loadApiKeys();
        toast.success('Klucz API został utworzony');
      } else {
        toast.error(json.error?.message || 'Błąd tworzenia klucza');
      }
    } catch {
      toast.error('Nie udało się utworzyć klucza API');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const json = await res.json();
      if (json.success) {
        await loadApiKeys();
        toast.success('Klucz API został unieważniony');
      }
    } catch {
      toast.error('Nie udało się unieważnić klucza');
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success('Klucz skopiowany do schowka');
  };

  const togglePermission = (perm: ApiKeyPermission) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const resetCreateForm = () => {
    setNewKeyName('');
    setNewKeyPermissions([]);
    setCreatedRawKey(null);
  };

  return (
    <div className="space-y-4" data-view="api-keys">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Klucze API</CardTitle>
              <CardDescription>
                Zarządzaj kluczami API do integracji z zewnętrznymi aplikacjami
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) resetCreateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button data-action="create-api-key">
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy klucz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                {createdRawKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Klucz API został utworzony</DialogTitle>
                      <DialogDescription>
                        Skopiuj klucz teraz - nie będzie można go zobaczyć ponownie.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg bg-muted p-4">
                        <code className="text-sm break-all" data-value="raw-api-key">
                          {createdRawKey}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCopyKey(createdRawKey)}
                        data-action="copy-api-key"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Kopiuj klucz
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetCreateForm();
                        }}
                      >
                        Gotowe
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Utwórz nowy klucz API</DialogTitle>
                      <DialogDescription>
                        Klucz API pozwala na dostęp do danych MESOpos z zewnętrznych aplikacji.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="keyName">Nazwa klucza</Label>
                        <Input
                          id="keyName"
                          placeholder="np. Aplikacja mobilna, Integracja Glovo"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          data-field="api-key-name"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Uprawnienia</Label>
                        {ALL_API_KEY_PERMISSIONS.map((perm) => (
                          <div key={perm} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${perm}`}
                              checked={newKeyPermissions.includes(perm)}
                              onCheckedChange={() => togglePermission(perm)}
                              data-field={`permission-${perm}`}
                            />
                            <Label htmlFor={`perm-${perm}`} className="font-normal cursor-pointer">
                              {API_KEY_PERMISSION_LABELS[perm]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetCreateForm();
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button
                        onClick={handleCreate}
                        disabled={isCreating}
                        data-action="confirm-create-api-key"
                      >
                        {isCreating ? 'Tworzenie...' : 'Utwórz klucz'}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Ładowanie kluczy API...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium mb-1">Brak kluczy API</p>
              <p>Utwórz klucz API, aby umożliwić integrację z zewnętrznymi aplikacjami</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                  data-id={key.id}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Aktywny
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldOff className="h-3 w-3" />
                          Unieważniony
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {key.key_prefix}
                      </code>
                      <span>Utworzony: {formatDateTime(key.created_at)}</span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Ostatnio: {formatDateTime(key.last_used_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {key.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {API_KEY_PERMISSION_LABELS[perm]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {key.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          data-action={`revoke-key-${key.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unieważnij klucz API?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Klucz &ldquo;{key.name}&rdquo; zostanie trwale unieważniony.
                            Aplikacje korzystające z tego klucza stracą dostęp do API.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Unieważnij
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dokumentacja API</CardTitle>
              <CardDescription>
                Pełna dokumentacja REST API z opisem endpointów, parametrów i przykładami
              </CardDescription>
            </div>
            <Button variant="outline" asChild data-action="open-api-docs">
              <Link href="/api/docs" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Otwórz dokumentację
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">X-API-Key</code>
              <span>Dodaj ten nagłówek do każdego żądania z wartością klucza API wygenerowanego powyżej.</span>
            </div>
            <Separator />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-medium text-foreground">Menu</p>
                <div className="space-y-0.5 font-mono text-xs">
                  <p><span className="text-emerald-600">GET</span> /api/v1/menu/products</p>
                  <p><span className="text-blue-600">POST</span> /api/v1/menu/products</p>
                  <p><span className="text-emerald-600">GET</span> /api/v1/menu/categories</p>
                  <p><span className="text-blue-600">POST</span> /api/v1/menu/categories</p>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">Zamówienia</p>
                <div className="space-y-0.5 font-mono text-xs">
                  <p><span className="text-emerald-600">GET</span> /api/v1/orders</p>
                  <p><span className="text-blue-600">POST</span> /api/v1/orders</p>
                  <p><span className="text-violet-600">PATCH</span> /api/v1/orders/:id/status</p>
                </div>
              </div>
            </div>
            <p className="text-xs">
              Pełna lista endpointów wraz z przykładami request/response jest dostępna w{' '}
              <Link href="/api/docs" target="_blank" className="text-blue-600 hover:underline">
                dokumentacji API
              </Link>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
