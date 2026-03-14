// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { OrderCancellationReason } from '../OrderCancellationReason'

describe('OrderCancellationReason', () => {
  it('renders the cancellation reason when present', () => {
    render(<OrderCancellationReason reason="Brak składników" />)

    expect(screen.getByText('Powód anulowania')).toBeInTheDocument()
    expect(screen.getByText('Brak składników')).toBeInTheDocument()
  })

  it('returns null when reason is empty', () => {
    const { container } = render(<OrderCancellationReason reason="   " />)

    expect(container).toBeEmptyDOMElement()
  })
})
