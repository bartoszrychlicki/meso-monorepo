import { Resend } from 'resend'
import { formatPriceExact } from '@/lib/formatters'

export interface OrderEmailItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  variantName?: string | null
  spiceLevel?: 1 | 2 | 3 | null
  addons: Array<{ name: string; price: number }>
}

export interface OrderEmailData {
  orderId: string
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  deliveryType: 'delivery' | 'pickup'
  deliveryStreet?: string
  deliveryHouseNumber?: string
  deliveryCity?: string
  deliveryPostalCode?: string
  items: OrderEmailItem[]
  subtotal: number
  deliveryFee: number
  promoDiscount: number
  tip: number
  total: number
  paymentMethod: string
  locationName: string
  locationAddress: string
  locationCity: string
  trackingUrl?: string
}

export async function sendOrderConfirmationEmail(
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.customerEmail || !data.customerEmail.includes('@')) {
      console.log(`[Email] No valid email for order ${data.orderId}`)
      return { success: false, error: 'Invalid or missing email address' }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const orderNumber = data.orderId.slice(-8).toUpperCase()
    const html = buildOrderConfirmationHtml(data, orderNumber)

    const { data: result, error } = await resend.emails.send({
      from: 'MESO <zamowienia@mesofood.pl>',
      to: data.customerEmail,
      subject: `Zamówienie #${orderNumber} potwierdzone – MESO`,
      html,
    })

    if (error) {
      console.error(`[Email] Resend error for order ${data.orderId}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Sent confirmation for order ${data.orderId}, id: ${result?.id}`)
    return { success: true }
  } catch (err) {
    console.error(`[Email] Unexpected error for order ${data.orderId}:`, err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

const SPICE_LABELS: Record<number, string> = {
  1: '\u{1F525} Mild',
  2: '\u{1F525}\u{1F525} Medium',
  3: '\u{1F525}\u{1F525}\u{1F525} Hell',
}

export function buildOrderConfirmationHtml(
  data: OrderEmailData,
  orderNumber: string
): string {
  const itemRows = data.items
    .map((item) => {
      const details: string[] = []
      if (item.variantName) details.push(item.variantName)
      if (item.spiceLevel) details.push(SPICE_LABELS[item.spiceLevel] ?? '')
      const detailStr = details.length > 0 ? `<br/><span style="color:#94a3b8;font-size:13px;">${details.join(' &middot; ')}</span>` : ''

      const addonRows = item.addons
        .map(
          (a) =>
            `<tr><td style="padding:2px 0 2px 24px;color:#94a3b8;font-size:13px;">+ ${a.name}</td><td style="padding:2px 0;text-align:right;color:#94a3b8;font-size:13px;">${formatPriceExact(a.price)}</td></tr>`
        )
        .join('')

      return `
        <tr>
          <td style="padding:8px 0;color:#f8fafc;font-size:14px;">
            ${item.quantity} &times; ${item.productName}${detailStr}
          </td>
          <td style="padding:8px 0;text-align:right;color:#f8fafc;font-size:14px;white-space:nowrap;">
            ${formatPriceExact(item.totalPrice)}
          </td>
        </tr>
        ${addonRows}
      `
    })
    .join('')

  const summaryRows: string[] = []
  summaryRows.push(summaryRow('Wartość zamówienia', data.subtotal))
  if (data.deliveryType === 'delivery') {
    summaryRows.push(summaryRow('Dostawa', data.deliveryFee))
  }
  if (data.promoDiscount > 0) {
    summaryRows.push(summaryRow('Rabat', -data.promoDiscount, '#22c55e'))
  }
  if (data.tip > 0) {
    summaryRows.push(summaryRow('Napiwek', data.tip))
  }
  summaryRows.push(
    `<tr>
      <td style="padding:12px 0 0;color:#f8fafc;font-size:16px;font-weight:700;border-top:1px solid #334155;">Razem</td>
      <td style="padding:12px 0 0;text-align:right;color:#f8fafc;font-size:16px;font-weight:700;border-top:1px solid #334155;">${formatPriceExact(data.total)}</td>
    </tr>`
  )

  let deliverySection: string
  if (data.deliveryType === 'pickup') {
    deliverySection = `
      <div style="margin-top:24px;padding:16px;background-color:#1e293b;border-radius:8px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">ODBIÓR OSOBISTY</p>
        <p style="margin:0;color:#f8fafc;font-size:14px;font-weight:600;">${data.locationName}</p>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">${data.locationAddress}, ${data.locationCity}</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Szacowany czas: ~20-30 min</p>
      </div>
    `
  } else {
    deliverySection = `
      <div style="margin-top:24px;padding:16px;background-color:#1e293b;border-radius:8px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">ADRES DOSTAWY</p>
        <p style="margin:0;color:#f8fafc;font-size:14px;font-weight:600;">
          ${data.deliveryStreet ?? ''} ${data.deliveryHouseNumber ?? ''}
        </p>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">
          ${data.deliveryPostalCode ?? ''} ${data.deliveryCity ?? ''}
        </p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Szacowany czas dostawy: ~30-45 min</p>
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#020617;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0;">
      <h1 style="margin:0;color:#ef4444;font-size:28px;font-weight:800;letter-spacing:2px;">MESO</h1>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;letter-spacing:1px;">SMART ASIAN COMFORT</p>
    </div>

    <!-- Main card -->
    <div style="background-color:#0f172a;border-radius:12px;padding:24px;border:1px solid #1e293b;">

      <!-- Confirmation heading -->
      <div style="text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:32px;">&#10003;</p>
        <h2 style="margin:8px 0 0;color:#f8fafc;font-size:20px;font-weight:700;">Zamówienie potwierdzone!</h2>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">
          Cześć ${data.customerFirstName}! Twoje zamówienie <strong style="color:#f8fafc;">#${orderNumber}</strong> zostało przyjęte.
        </p>
      </div>

      <!-- Items -->
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr><td colspan="2" style="padding:0 0 8px;color:#94a3b8;font-size:12px;letter-spacing:1px;border-bottom:1px solid #1e293b;">TWOJE ZAMÓWIENIE</td></tr>
        ${itemRows}
      </table>

      <!-- Summary -->
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        ${summaryRows.join('')}
      </table>

      <!-- Delivery / Pickup info -->
      ${deliverySection}

      <!-- Track order CTA -->
      ${data.trackingUrl ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="${data.trackingUrl}" style="display:inline-block;padding:14px 32px;background-color:#ef4444;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
          Sledz zamowienie
        </a>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;color:#64748b;font-size:12px;">
      <p style="margin:0;">Pytania? Napisz do nas: <a href="mailto:zamowienia@mesofood.pl" style="color:#94a3b8;">zamowienia@mesofood.pl</a></p>
      <p style="margin:8px 0 0;">&copy; 2026 MESO &middot; Smart Asian Comfort</p>
    </div>

  </div>
</body>
</html>`
}

function summaryRow(label: string, amount: number, color = '#cbd5e1'): string {
  return `<tr>
    <td style="padding:4px 0;color:${color};font-size:14px;">${label}</td>
    <td style="padding:4px 0;text-align:right;color:${color};font-size:14px;">${formatPriceExact(amount)}</td>
  </tr>`
}
