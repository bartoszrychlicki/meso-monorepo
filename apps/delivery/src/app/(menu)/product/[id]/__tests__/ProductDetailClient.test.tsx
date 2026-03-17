// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addItemMock, backMock, toastErrorMock } = vi.hoisted(() => ({
  addItemMock: vi.fn(),
  backMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}))

vi.mock('next/image', () => ({
  default: ({ alt = '', ...props }: Record<string, unknown>) => {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img alt={String(alt)} {...props} />
  },
}))

vi.mock('@/stores/cartStore', () => ({
  useCartStore: (selector: (state: { addItem: typeof addItemMock }) => unknown) =>
    selector({ addItem: addItemMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: toastErrorMock,
  },
}))

import { ProductDetailClient } from '../ProductDetailClient'

describe('ProductDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders unavailable state and blocks adding to cart', () => {
    render(
      <ProductDetailClient
        product={{
          id: 'prod-1',
          name: 'Ramen',
          slug: 'ramen',
          description: 'Opis',
          price: 39,
          is_available: false,
          category: {
            id: 'cat-1',
            name: 'Ramen',
            slug: 'ramen',
          },
        }}
      />
    )

    expect(screen.getByText(/Produkt chwilowo niedostępny/i)).toBeInTheDocument()

    const addButton = screen.getByTestId('product-detail-add-to-cart')
    expect(addButton).toBeDisabled()
    expect(addButton).toHaveTextContent('NIEDOSTĘPNE')

    fireEvent.click(addButton)

    expect(addItemMock).not.toHaveBeenCalled()
  })
})
