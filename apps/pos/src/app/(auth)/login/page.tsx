import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/modules/users/components/login-form';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;

  return (
    <div className="space-y-4" data-page="login">
      <Card className="border-0 shadow-2xl backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl shadow-lg">
            M
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">MESOpos</CardTitle>
          <CardDescription className="text-base">
            System zarzadzania punktem sprzedazy
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <LoginForm redirectTo={redirect} />
        </CardContent>
      </Card>
    </div>
  );
}
