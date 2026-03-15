// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { OrderingClosureBanner } from '../ordering-closure-banner'

describe('OrderingClosureBanner', () => {
  it('renders pause message when ordering is paused', () => {
    render(
      <OrderingClosureBanner
        config={{
          opening_time: '11:00:00',
          ordering_paused_until_date: '2026-03-20',
          ordering_paused_until_time: '11:30:00',
        }}
        now={new Date(2026, 2, 19, 18, 0, 0)}
      />
    )

    expect(screen.getByText(/jestesmy aktualnie zamknieci/i)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByText(/11:30/)).toBeInTheDocument()
  })

  it('renders nothing when ordering pause is inactive', () => {
    const { container } = render(
      <OrderingClosureBanner
        config={{
          opening_time: '11:00:00',
          ordering_paused_until_date: '2026-03-20',
          ordering_paused_until_time: '11:30:00',
        }}
        now={new Date(2026, 2, 20, 12, 0, 0)}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
