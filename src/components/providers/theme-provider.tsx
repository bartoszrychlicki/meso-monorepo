'use client';

import { type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Future: dark mode support via next-themes
  return <>{children}</>;
}
