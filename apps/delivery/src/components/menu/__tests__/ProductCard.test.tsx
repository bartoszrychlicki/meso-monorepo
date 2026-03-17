// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addItemMock, toastErrorMock } = vi.hoisted(() => ({
  addItemMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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

import { ProductCard } from '../ProductCard'

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows unavailable label and blocks quick add for unavailable products', () => {
    render(
      <ProductCard
        quickAdd
        product={{
          id: 'prod-1',
          name: 'Ramen',
          slug: 'ramen',
          price: 39,
          is_available: false,
        }}
      />
    )

    expect(screen.getByText('Niedostępne')).toBeInTheDocument()

    const addButton = screen.getByRole('button')
    expect(addButton).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(addButton)

    expect(addItemMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('Ramen jest chwilowo niedostępny')
  })
})
