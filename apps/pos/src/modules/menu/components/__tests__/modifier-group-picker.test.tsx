import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModifierGroupPicker } from '../modifier-group-picker';
import { ModifierType, ModifierAction } from '@/types/enums';
import { ModifierGroup } from '@/types/menu';

const mockGroups: ModifierGroup[] = [
  {
    id: 'group-1',
    name: 'Dodatki',
    type: ModifierType.MULTIPLE,
    required: false,
    min_selections: 0,
    max_selections: 3,
    modifiers: [
      {
        id: 'mod-1',
        name: 'Ser',
        price: 4,
        is_available: true,
        sort_order: 0,
        modifier_action: ModifierAction.ADD,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Sosy',
    type: ModifierType.SINGLE,
    required: true,
    min_selections: 1,
    max_selections: 1,
    modifiers: [
      {
        id: 'mod-2',
        name: 'Sos mayo',
        price: 0,
        is_available: true,
        sort_order: 0,
        modifier_action: ModifierAction.ADD,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('ModifierGroupPicker', () => {
  it('renders groups with checkboxes', () => {
    render(
      <ModifierGroupPicker
        groups={mockGroups}
        selectedGroupIds={[]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Dodatki')).toBeInTheDocument();
    expect(screen.getByText('Sosy')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('filters groups by search query', async () => {
    render(
      <ModifierGroupPicker
        groups={mockGroups}
        selectedGroupIds={[]}
        onChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/szukaj grupy/i), {
      target: { value: 'Sosy' },
    });

    await waitFor(() => {
      expect(screen.getByText('Sosy')).toBeInTheDocument();
      expect(screen.queryByText('Dodatki')).not.toBeInTheDocument();
    });
  });

  it('calls onChange with updated group ids', () => {
    const onChange = vi.fn();

    render(
      <ModifierGroupPicker
        groups={mockGroups}
        selectedGroupIds={['group-1']}
        onChange={onChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith([]);

    onChange.mockClear();

    fireEvent.click(checkboxes[1]);
    expect(onChange).toHaveBeenCalledWith(['group-1', 'group-2']);
  });
});
