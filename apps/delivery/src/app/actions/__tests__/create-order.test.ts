import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderInput, Order } from '@meso/core'
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
})
