'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, RotateCcw, Power, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateStaffUserSchema, type CreateStaffUserInput } from '@/schemas/user';
import {
  getStaffUsers,
  createStaffUser,
  resetStaffPassword,
  deleteStaffUser,
  toggleStaffActive,
  toggleStaffAdmin,
} from './actions';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteUser, setDeleteUser] = useState<StaffUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const form = useForm<CreateStaffUserInput>({
    resolver: zodResolver(CreateStaffUserSchema),
    defaultValues: { name: '', email: '', password: '', is_admin: false },
  });

  const loadUsers = async () => {
    const result = await getStaffUsers();
    const data = Array.isArray(result) ? result : (result?.data || []);
    setUsers(data as StaffUser[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // Get current user ID to prevent self-deletion
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const sb = createClient();
        sb.auth.getUser().then(({ data }) => {
          if (data?.user) setCurrentUserId(data.user.id);
        }).catch(() => {});
      } catch {
        // Supabase client not available (e.g., test environment)
      }
    }).catch(() => {});
  }, []);

  const handleCreate = async (data: CreateStaffUserInput) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set('name', data.name);
    formData.set('email', data.email);
    formData.set('password', data.password);
    formData.set('is_admin', String(data.is_admin));

    const result = await createStaffUser(formData);

    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success('Uzytkownik zostal utworzony.');
    setDialogOpen(false);
    form.reset();
    setIsSubmitting(false);
    await loadUsers();
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    setIsSubmitting(true);
    const result = await resetStaffPassword(resetPasswordUser.id, newPassword);
    setIsSubmitting(false);
    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Haslo zostalo zmienione dla ${resetPasswordUser.name}.`);
    setResetPasswordUser(null);
    setNewPassword('');
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsSubmitting(true);
    const result = await deleteStaffUser(deleteUser.id);
    setIsSubmitting(false);
    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Uzytkownik ${deleteUser.name} zostal usuniety.`);
    setDeleteUser(null);
    await loadUsers();
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const result = await toggleStaffActive(userId, !isActive);
    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(isActive ? 'Uzytkownik zostal dezaktywowany.' : 'Uzytkownik zostal aktywowany.');
    await loadUsers();
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const makeAdmin = currentRole !== 'admin';
    const result = await toggleStaffAdmin(userId, makeAdmin);
    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(makeAdmin ? 'Nadano uprawnienia administratora.' : 'Odebrano uprawnienia administratora.');
    await loadUsers();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-view="admin-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uzytkownicy</h1>
          <p className="text-muted-foreground">Zarzadzaj uzytkownikami systemu POS.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-action="add-user">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj uzytkownika
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowy uzytkownik</DialogTitle>
              <DialogDescription>
                Uzupelnij dane pracownika, aby utworzyc nowe konto do systemu POS.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Imie i nazwisko</Label>
                <Input
                  id="create-name"
                  {...form.register('name')}
                  data-field="name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  {...form.register('email')}
                  data-field="email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Haslo</Label>
                <Input
                  id="create-password"
                  type="password"
                  {...form.register('password')}
                  data-field="password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-is-admin"
                  {...form.register('is_admin')}
                  aria-label="Administrator"
                />
                <Label htmlFor="create-is-admin">Administrator</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nie znaleziono uzytkownikow.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imie i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-id={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={user.role === 'admin' ? 'Odbierz admin' : 'Nadaj admin'}
                        onClick={() => handleToggleAdmin(user.id, user.role)}
                        data-action="toggle-admin"
                      >
                        {user.role === 'admin' ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Resetuj haslo"
                        onClick={() => {
                          setResetPasswordUser(user);
                          setNewPassword('');
                        }}
                        data-action="reset-password"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={user.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        data-action="toggle-active"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      {currentUserId !== user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Usun uzytkownika"
                          onClick={() => setDeleteUser(user)}
                          data-action="delete-user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetPasswordUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordUser(null);
            setNewPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ustaw nowe haslo: {resetPasswordUser?.name}</DialogTitle>
            <DialogDescription>
              Wprowadz nowe haslo dla wybranego uzytkownika.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe haslo</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 znakow"
                data-field="new-password"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              Anuluj
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isSubmitting || newPassword.length < 6}
            >
              {isSubmitting ? 'Zapisywanie...' : 'Ustaw haslo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={!!deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usun uzytkownika</DialogTitle>
            <DialogDescription>
              Potwierdz usuniecie konta uzytkownika z systemu.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunac uzytkownika <strong>{deleteUser?.name}</strong> ({deleteUser?.email})?
            Ta operacja jest nieodwracalna.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Usuwanie...' : 'Usun'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
