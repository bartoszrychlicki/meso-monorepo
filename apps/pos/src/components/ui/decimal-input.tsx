'use client';

import type { ComponentProps } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  formatLocaleNumber,
  parseLocaleNumber,
} from '@/lib/utils/parse-locale-number';

interface DecimalInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    'value' | 'onChange' | 'type' | 'inputMode'
  > {
  allowNegative?: boolean;
  onChange: (value: number | null) => void;
  value: number | null | undefined;
}

/**
 * A controlled number input that supports comma as decimal separator.
 * Keeps the raw string locally while the user is typing so that
 * intermediate states like "0," or "1." are not erased.
 */
export function DecimalInput({
  value,
  onChange,
  allowNegative = false,
  ...props
}: DecimalInputProps) {
  const [raw, setRaw] = useState(formatLocaleNumber(value));
  const isFocused = useRef(false);

  // Sync from parent only when not focused (e.g. external reset)
  useEffect(() => {
    if (!isFocused.current) {
      setRaw(formatLocaleNumber(value));
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={raw}
      onFocus={() => {
        isFocused.current = true;
      }}
      onChange={(e) => {
        const nextValue = e.target.value;
        const pattern = allowNegative
          ? /^-?(?:\d*(?:[.,]\d*)?)?$/
          : /^\d*(?:[.,]\d*)?$/;

        if (pattern.test(nextValue) || nextValue === '') {
          setRaw(nextValue);
          onChange(parseLocaleNumber(nextValue));
        }
      }}
      onBlur={() => {
        isFocused.current = false;
        const parsed = parseLocaleNumber(raw);
        setRaw(formatLocaleNumber(parsed));
        onChange(parsed);
      }}
      {...props}
    />
  );
}
