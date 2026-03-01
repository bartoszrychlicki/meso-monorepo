import { AppLayout } from '@/components/layout/AppLayout'

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
