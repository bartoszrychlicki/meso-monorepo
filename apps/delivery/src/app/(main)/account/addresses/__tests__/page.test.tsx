// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddressesPage from '../page'

const { mockFrom, toastError, toastSuccess } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

let fetchResult: unknown[] = []

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'customer-123' },
    isLoading: false,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}))

function createSelectChain() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: fetchResult, error: null }),
  }

  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchResult = []

  mockFrom.mockImplementation(() => ({
    ...createSelectChain(),
    insert: vi.fn(async () => ({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  }))
})

afterEach(() => {
  cleanup()
})

describe('AddressesPage', () => {
  it('loads addresses from the crm_customer_addresses table', async () => {
    render(<AddressesPage />)

    await screen.findByText('Nie masz jeszcze żadnych zapisanych adresów')

    expect(mockFrom).toHaveBeenCalledWith('crm_customer_addresses')
  })

  it('creates a new address via the crm_customer_addresses table', async () => {
    fetchResult = [
      {
        id: 'addr-1',
        customer_id: 'customer-123',
        label: 'Biuro',
        street: 'Grunwaldzka',
        building_number: '10',
        apartment_number: null,
        city: 'Gdańsk',
        postal_code: '80-001',
        notes: null,
        is_default: true,
        created_at: '2026-03-09T10:00:00.000Z',
      },
    ]

    const user = userEvent.setup()

    render(<AddressesPage />)

    await screen.findByText('Biuro')

    await user.click(screen.getByRole('button', { name: 'Dodaj' }))
    await user.type(screen.getByPlaceholderText('np. Dom, Praca, Biuro'), 'Dom')
    await user.type(screen.getByPlaceholderText('np. Długa'), 'Leśna')
    await user.type(screen.getByPlaceholderText('15'), '7A')
    await user.type(screen.getByPlaceholderText('80-001'), '80-200')
    await user.type(screen.getByPlaceholderText('Gdańsk'), 'Gdynia')
    await user.click(screen.getByRole('button', { name: 'Dodaj adres' }))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Adres został dodany')
    })

    expect(mockFrom.mock.calls.every(([table]) => table === 'crm_customer_addresses')).toBe(true)
  })
})
