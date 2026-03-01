'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface BreadcrumbContextType {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  labels: {},
  setLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels((prev) => {
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ labels, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Hook for dynamic pages to set a breadcrumb label for a URL segment.
 * Example: useBreadcrumbLabel('abc-123-uuid', 'Frytki Soboro');
 */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined) {
  const { setLabel } = useContext(BreadcrumbContext);

  useEffect(() => {
    if (segment && label) {
      setLabel(segment, label);
    }
  }, [segment, label, setLabel]);
}

export function useBreadcrumbLabels() {
  return useContext(BreadcrumbContext).labels;
}
