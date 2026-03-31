import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderInput, Order } from '@meso/core'
import { ApiError } from '@meso/api-client'
import { createOrderAction } from '../create-order'

const { mockCreate, mockGetPosApi } = vi.hoisted(() => {
  const localMockCreate = vi.fn()
  const localMockGetPosApi = vi.fn(() => ({
    orders: {
      create: localMockCreate,
    },
  }))

  return {
    mockCreate: localMockCreate,
    mockGetPosApi: localMockGetPosApi,
  }
})

vi.mock('@/lib/pos-api', () => ({
  getPosApi: mockGetPosApi,
}))

describe('createOrderAction', () => {
  const input = {} as CreateOrderInput

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success result when POS creates order', async () => {
    const order = {
      id: 'order-1',
    } as Order

    mockCreate.mockResolvedValueOnce({
      success: true,
      data: order,
    })

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: true,
      data: order,
    })
  })

  it('returns business error from POS response without throwing', async () => {
    mockCreate.mockResolvedValueOnce({
      success: false,
      error: {
        message: 'POS API returned validation error',
      },
    })

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error: 'POS API returned validation error',
    })
  })

  it('returns fallback error when POS client throws', async () => {
    mockGetPosApi.mockImplementationOnce(() => {
      throw new Error('Missing required environment variables: POS_API_URL')
    })

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error: 'Nie udało się utworzyć zamówienia. Spróbuj ponownie za chwilę.',
    })
  })

  it('returns actionable validation message when POS throws VALIDATION_ERROR', async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError(
        {
          code: 'VALIDATION_ERROR',
          message: 'Błąd walidacji danych',
          details: [
            { field: 'items.0.product_id', message: 'Produkt nie istnieje' },
            { field: 'customer_phone', message: 'Nieprawidłowy numer telefonu' },
          ],
        },
        422
      )
    )

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error:
        'Popraw dane zamówienia: Pozycje zamówienia: Produkt nie istnieje Numer telefonu: Nieprawidłowy numer telefonu',
    })
  })

  it('maps location validation errors to a readable message', async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError(
        {
          code: 'VALIDATION_ERROR',
          message: 'Błąd walidacji danych',
          details: [
            {
              field: 'location_id',
              message: 'Ta lokalizacja jest obecnie nieaktywna i nie przyjmuje nowych zamówień.',
            },
          ],
        },
        422
      )
    )

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error:
        'Popraw dane zamówienia: Lokalizacja: Ta lokalizacja jest obecnie nieaktywna i nie przyjmuje nowych zamówień.',
    })
  })

  it('returns ApiError message for non-validation API errors', async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError(
        {
          code: 'FORBIDDEN',
          message: 'Brak uprawnień do tworzenia zamówienia',
        },
        403
      )
    )

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error: 'Brak uprawnień do tworzenia zamówienia',
    })
  })

  it('returns generic validation guidance when VALIDATION_ERROR has no details', async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError(
        {
          code: 'VALIDATION_ERROR',
          message: 'Błąd walidacji danych',
        },
        422
      )
    )

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error: 'Nieprawidłowe dane zamówienia. Sprawdź formularz i spróbuj ponownie.',
    })
  })

  it('handles ApiError-like objects even when instanceof check would fail', async () => {
    const apiLikeError = Object.assign(new Error('Błąd walidacji danych'), {
      name: 'ApiError',
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'payment_method', message: 'Nieprawidłowa metoda płatności' }],
    })

    mockCreate.mockRejectedValueOnce(apiLikeError)

    const result = await createOrderAction(input)

    expect(result).toEqual({
      success: false,
      error: 'Popraw dane zamówienia: Metoda płatności: Nieprawidłowa metoda płatności',
    })
  })
})
