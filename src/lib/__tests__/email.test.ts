import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendOrderConfirmationEmail, buildOrderConfirmationHtml } from '../email'
import type { OrderEmailData } from '../email'

// Mock resend
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSend },
  })),
}))

const sampleData: OrderEmailData = {
  orderId: '66dda102-abcd-1234-5678-abcdef012345',
  customerFirstName: 'Jan',
  customerLastName: 'Kowalski',
  customerEmail: 'jan@example.com',
  deliveryType: 'pickup',
  items: [
    {
      productName: 'Spicy Miso Ramen',
      quantity: 2,
      unitPrice: 36,
      totalPrice: 72,
      variantName: 'Duzy',
      spiceLevel: 2,
      addons: [{ name: 'Marynowane jajko', price: 5 }],
    },
  ],
  subtotal: 77,
  deliveryFee: 0,
  promoDiscount: 0,
  tip: 5,
  total: 82,
  paymentMethod: 'blik',
  locationName: 'MESO Mokotow',
  locationAddress: 'ul. Czerniakowska 100',
  locationCity: 'Warszawa',
}

describe('buildOrderConfirmationHtml', () => {
  it('zawiera numer zamowienia', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('#1E240')
  })

  it('zawiera imie klienta', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('Jan')
  })

  it('zawiera nazwy produktow', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('Spicy Miso Ramen')
  })

  it('zawiera wariant i poziom ostrosci', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('Duzy')
    expect(html).toMatch(/🔥/)
  })

  it('zawiera addony', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('Marynowane jajko')
  })

  it('zawiera sume', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('82')
  })

  it('pokazuje info o odbiorze dla pickup', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).toContain('MESO Mokotow')
    expect(html).toContain('ul. Czerniakowska 100')
  })

  it('pokazuje adres dostawy dla delivery', () => {
    const deliveryData: OrderEmailData = {
      ...sampleData,
      deliveryType: 'delivery',
      deliveryStreet: 'Marszalkowska',
      deliveryHouseNumber: '1',
      deliveryCity: 'Warszawa',
      deliveryPostalCode: '00-001',
      deliveryFee: 7.99,
      total: 89.99,
    }
    const html = buildOrderConfirmationHtml(deliveryData, '1E240')
    expect(html).toContain('Marszalkowska')
    expect(html).toContain('00-001')
  })

  it('ukrywa rabat i napiwek gdy sa zerowe', () => {
    const noExtras: OrderEmailData = { ...sampleData, tip: 0, promoDiscount: 0 }
    const html = buildOrderConfirmationHtml(noExtras, '1E240')
    expect(html).not.toContain('Napiwek')
    expect(html).not.toContain('Rabat')
  })

  it('zawiera link do sledzenia zamowienia gdy trackingUrl podany', () => {
    const withTracking: OrderEmailData = {
      ...sampleData,
      trackingUrl: 'https://meso.pl/order-confirmation?orderId=123456',
    }
    const html = buildOrderConfirmationHtml(withTracking, '1E240')
    expect(html).toContain('https://meso.pl/order-confirmation?orderId=123456')
    expect(html).toContain('Sledz zamowienie')
  })

  it('nie zawiera przycisku sledzenia gdy brak trackingUrl', () => {
    const html = buildOrderConfirmationHtml(sampleData, '1E240')
    expect(html).not.toContain('Sledz zamowienie')
  })
})

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'test_key')
    mockSend.mockReset()
  })

  it('zwraca success gdy Resend odpowiada poprawnie', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'msg_123' }, error: null })

    const result = await sendOrderConfirmationEmail(sampleData)
    expect(result.success).toBe(true)
  })

  it('zwraca error gdy Resend zwraca blad', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limit' } })

    const result = await sendOrderConfirmationEmail(sampleData)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Rate limit')
  })

  it('pomija wysylke gdy email jest nieprawidlowy', async () => {
    const noEmail = { ...sampleData, customerEmail: 'invalid' }
    const result = await sendOrderConfirmationEmail(noEmail)
    expect(result.success).toBe(false)
    expect(result.error).toContain('email')
  })

  it('nie rzuca wyjatkiem gdy Resend rzuca', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error'))

    const result = await sendOrderConfirmationEmail(sampleData)
    expect(result.success).toBe(false)
  })
})
