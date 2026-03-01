'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { parseLocaleNumber } from '@/lib/utils/parse-locale-number';

interface DecimalInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  'data-field'?: string;
}

/**
 * A controlled number input that supports comma as decimal separator.
 * Keeps the raw string locally while the user is typing so that
 * intermediate states like "0," or "1." are not erased.
 */
export function DecimalInput({
  value,
  onChange,
  className,
  placeholder,
  ...props
}: DecimalInputProps) {
  const [raw, setRaw] = useState(value ? String(value) : '');
  const isFocused = useRef(false);

  // Sync from parent only when not focused (e.g. external reset)
  useEffect(() => {
    if (!isFocused.current) {
      setRaw(value ? String(value) : '');
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={raw}
      onFocus={() => {
        isFocused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        // Allow digits, dot, comma, and empty string
        if (/^[0-9]*[.,]?[0-9]*$/.test(v) || v === '') {
          setRaw(v);
          onChange(parseLocaleNumber(v));
        }
      }}
      onBlur={() => {
        isFocused.current = false;
        // Clean up display on blur
        const parsed = parseLocaleNumber(raw);
        setRaw(parsed ? String(parsed) : '');
      }}
      {...props}
    />
  );
}
