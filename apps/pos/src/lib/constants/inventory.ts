import { VatRate, ConsumptionType } from '@/types/enums';

export const VAT_RATE_LABELS: Record<VatRate, string> = {
  [VatRate.PTU_A]: 'PTU A (23%)',
  [VatRate.PTU_B]: 'PTU B (8%)',
  [VatRate.PTU_C]: 'PTU C (0%)',
  [VatRate.PTU_D]: 'PTU D (5%)',
  [VatRate.PTU_E]: 'PTU E (0% NP)',
  [VatRate.PTU_F]: 'PTU F (0% zw.)',
  [VatRate.PTU_G]: 'PTU G (0% zw.)',
};

export const CONSUMPTION_TYPE_LABELS: Record<ConsumptionType, string> = {
  [ConsumptionType.PRODUCT]: 'Produkt',
  [ConsumptionType.COMPONENTS]: 'Skladowe',
};

export const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'dag', label: 'dag' },
  { value: 'l', label: 'l' },
  { value: 'dl', label: 'dl' },
  { value: 'ml', label: 'ml' },
  { value: 'szt', label: 'szt' },
  { value: 'op', label: 'op' },
] as const;
