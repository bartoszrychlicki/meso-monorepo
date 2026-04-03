import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PosI18nProvider } from '@/lib/i18n/provider';
import { POS_LOCALE_COOKIE, resolvePosLocale } from '@/lib/i18n/config';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'MESOpos - System POS',
  description: 'System POS dla sieci gastronomicznej',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a12',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = resolvePosLocale(cookieStore.get(POS_LOCALE_COOKIE)?.value);

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <PosI18nProvider initialLocale={initialLocale}>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster position="top-right" richColors />
            </QueryProvider>
          </ThemeProvider>
        </PosI18nProvider>
      </body>
    </html>
  );
}
