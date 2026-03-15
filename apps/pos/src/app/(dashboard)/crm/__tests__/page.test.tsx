import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/crm/components/customer-table', () => ({
  CustomerTable: ({ customers }: { customers: Array<{ first_name: string }> }) => (
    <div>CustomerTable:{customers.map((customer) => customer.first_name).join(',')}</div>
  ),
}));

vi.mock('@/modules/crm/components/customer-details-sheet', () => ({
  CustomerDetailsSheet: () => <div>CustomerDetailsSheet</div>,
}));

vi.mock('@/modules/crm/components/rewards-manager', () => ({
  RewardsManager: () => <div>RewardsManager</div>,
}));

vi.mock('@/modules/crm/components/promo-codes-manager', () => ({
  PromoCodesManager: () => <div>PromoCodesManager</div>,
}));

vi.mock('@/seed', () => ({
  seedAll: vi.fn(),
}));

vi.mock('@/modules/crm/store', () => ({
  useCRMStore: () => ({
    customers: [{ id: '1', first_name: 'Jan' }],
    loadCustomers: vi.fn(),
    getFilteredCustomers: () => [{ id: '1', first_name: 'Jan' }],
    getSelectedCustomer: () => null,
    getCustomerStats: () => ({ total: 1, bronze: 1, silver: 0, gold: 0 }),
    selectedCustomerId: null,
    setSelectedCustomerId: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    tierFilter: 'all',
    setTierFilter: vi.fn(),
    isLoading: false,
  }),
}));

import CRMPage from '../page';

describe('CRM page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tabs for customers, rewards, and promotional codes', () => {
    render(<CRMPage />);

    expect(screen.getByRole('heading', { name: 'Klienci CRM' })).toBeInTheDocument();
    expect(screen.getByText('Klienci')).toBeInTheDocument();
    expect(screen.getByText('Nagrody')).toBeInTheDocument();
    expect(screen.getByText('Kody promocyjne')).toBeInTheDocument();
    expect(screen.getByText('CustomerTable:Jan')).toBeInTheDocument();
    expect(screen.getByText('CustomerDetailsSheet')).toBeInTheDocument();
    expect(screen.getByText('RewardsManager')).toBeInTheDocument();
    expect(screen.getByText('PromoCodesManager')).toBeInTheDocument();
  });
});
