import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DecimalInput } from '../decimal-input';

function DecimalInputHarness({
  initialValue = null,
  onValueChange,
}: {
  initialValue?: number | null;
  onValueChange?: (value: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initialValue);

  return (
    <DecimalInput
      aria-label="decimal-input"
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
      }}
    />
  );
}

describe('DecimalInput', () => {
  it('accepts comma decimals and keeps numeric state', () => {
    const onValueChange = vi.fn();

    render(<DecimalInputHarness onValueChange={onValueChange} />);

    const input = screen.getByLabelText('decimal-input');
    fireEvent.change(input, { target: { value: '1,5' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('1,5');
    expect(onValueChange).toHaveBeenLastCalledWith(1.5);
  });

  it('normalizes dot decimals to comma on blur', () => {
    render(<DecimalInputHarness />);

    const input = screen.getByLabelText('decimal-input');
    fireEvent.change(input, { target: { value: '1.5' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('1,5');
  });

  it('keeps an empty input as null instead of forcing zero', () => {
    const onValueChange = vi.fn();

    render(
      <DecimalInputHarness
        initialValue={12.49}
        onValueChange={onValueChange}
      />
    );

    const input = screen.getByLabelText('decimal-input');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });
});
