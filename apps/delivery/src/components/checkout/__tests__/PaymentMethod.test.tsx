// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PaymentMethod } from '@/components/checkout/PaymentMethod'

afterEach(() => {
  cleanup()
})

describe('PaymentMethod', () => {
  it('hides pay-on-pickup when location config turns it off', () => {
    const onChange = vi.fn()

    render(
      <PaymentMethod
        selected="online"
        onChange={onChange}
        payOnPickupEnabled={false}
        payOnPickupFee={2}
        payOnPickupMaxOrder={100}
        orderSubtotal={40}
      />
    )

    expect(screen.queryByRole('button', {
      name: /Płatność przy odbiorze/i,
    })).toBeNull()
    expect(screen.getByText(/jest wyłączona/i)).toBeTruthy()
  })

  it('keeps pay-on-pickup enabled when config allows it and subtotal is below limit', () => {
    const onChange = vi.fn()

    render(
      <PaymentMethod
        selected="online"
        onChange={onChange}
        payOnPickupEnabled
        payOnPickupFee={2}
        payOnPickupMaxOrder={100}
        orderSubtotal={40}
      />
    )

    const payOnPickupButton = screen.getByRole('button', {
      name: /Płatność przy odbiorze/i,
    }) as HTMLButtonElement

    expect(payOnPickupButton.disabled).toBe(false)
  })

  it('disables pay-on-pickup when subtotal exceeds location limit', () => {
    const onChange = vi.fn()

    render(
      <PaymentMethod
        selected="online"
        onChange={onChange}
        payOnPickupEnabled
        payOnPickupFee={2}
        payOnPickupMaxOrder={100}
        orderSubtotal={140}
      />
    )

    const payOnPickupButton = screen.getByRole('button', {
      name: /Płatność przy odbiorze/i,
    }) as HTMLButtonElement

    expect(payOnPickupButton.disabled).toBe(true)
    expect(screen.getByText(/dostępna do 100 zł/i)).toBeTruthy()
  })
})
