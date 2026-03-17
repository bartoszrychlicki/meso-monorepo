import { Resend } from 'resend';
import type { Order } from '@/types/order';

interface PickupTimeAdjustedEmailData {
  orderId: string;
  orderNumber: string;
  customerFirstName: string;
  customerEmail: string;
  previousTime: string;
  newTime: string;
  trackingUrl?: string;
}

function resolveTrackingUrl(orderId: string): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return appUrl ? `${appUrl}/order-confirmation?orderId=${orderId}` : undefined;
}

function formatPickupDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function buildPickupTimeAdjustedEmailHtml(data: PickupTimeAdjustedEmailData): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#020617;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:24px 0;">
      <h1 style="margin:0;color:#ef4444;font-size:28px;font-weight:800;letter-spacing:2px;">MESO</h1>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;letter-spacing:1px;">SMART ASIAN COMFORT</p>
    </div>

    <div style="background-color:#0f172a;border-radius:12px;padding:24px;border:1px solid #1e293b;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:32px;">⏰</p>
        <h2 style="margin:8px 0 0;color:#f8fafc;font-size:20px;font-weight:700;">Zmiana czasu odbioru</h2>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">
          Cześć ${data.customerFirstName}! Zaktualizowaliśmy godzinę odbioru zamówienia
          <strong style="color:#f8fafc;"> #${data.orderNumber}</strong>.
        </p>
      </div>

      <div style="margin-top:24px;padding:16px;background-color:#1e293b;border-radius:8px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">POPRZEDNI CZAS</p>
        <p style="margin:0;color:#cbd5e1;font-size:14px;font-weight:600;">${formatPickupDateTime(data.previousTime)}</p>

        <p style="margin:16px 0 4px;color:#94a3b8;font-size:13px;">NOWY CZAS ODBIORU</p>
        <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">${formatPickupDateTime(data.newTime)}</p>
      </div>

      ${data.trackingUrl ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="${data.trackingUrl}" style="display:inline-block;padding:14px 32px;background-color:#ef4444;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
          Sledz zamowienie
        </a>
      </div>
      ` : ''}
    </div>

    <div style="text-align:center;padding:24px 0;color:#64748b;font-size:12px;">
      <p style="margin:0;">Pytania? Napisz do nas: <a href="mailto:zamowienia@mesofood.pl" style="color:#94a3b8;">zamowienia@mesofood.pl</a></p>
      <p style="margin:8px 0 0;">&copy; 2026 MESO &middot; Smart Asian Comfort</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPickupTimeAdjustedEmail(
  order: Pick<Order, 'id' | 'order_number' | 'delivery_address'>,
  previousTime: string,
  newTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerEmail = order.delivery_address?.email?.trim() ?? '';
    if (!customerEmail || !customerEmail.includes('@')) {
      return { success: false, error: 'Invalid or missing email address' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const orderNumber = order.order_number || order.id.slice(-8).toUpperCase();
    const html = buildPickupTimeAdjustedEmailHtml({
      orderId: order.id,
      orderNumber,
      customerFirstName: order.delivery_address?.firstName?.trim() || 'Kliencie',
      customerEmail,
      previousTime,
      newTime,
      trackingUrl: resolveTrackingUrl(order.id),
    });

    const { error } = await resend.emails.send({
      from: 'MESO <zamowienia@mesofood.pl>',
      to: customerEmail,
      subject: `Nowy czas odbioru zamówienia #${orderNumber} – MESO`,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
