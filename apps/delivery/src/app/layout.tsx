import type { Metadata, Viewport } from "next";
import { cookies, headers } from 'next/headers';
import { Inter, Orbitron, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DeliveryI18nProvider } from '@/lib/i18n/provider';
import { DELIVERY_LOCALE_COOKIE, resolveDeliveryLocale } from '@/lib/i18n/config';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "MESO - Smart Asian Comfort",
  description: "Zamów japońskie comfort food z dostawą. Ramen, Gyoza, Karaage.",
  keywords: ["ramen", "japanese food", "delivery", "gdańsk", "gyoza", "karaage"],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0118",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const initialLocale = resolveDeliveryLocale(
    cookieStore.get(DELIVERY_LOCALE_COOKIE)?.value,
    headerStore.get('accept-language')
  );

  return (
    <html lang={initialLocale}>
      <body
        className={`${inter.variable} ${orbitron.variable} ${notoSansJP.variable} antialiased`}
      >
        <DeliveryI18nProvider initialLocale={initialLocale}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'hsl(264 80% 8%)',
                color: 'hsl(220 20% 92%)',
                border: '1px solid hsl(270 40% 20%)',
              },
            }}
          />
          <Analytics />
          <SpeedInsights />
        </DeliveryI18nProvider>
      </body>
    </html>
  );
}
