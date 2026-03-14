import { describe, it, expect } from 'vitest';
import { LocationType } from '@/types/enums';
import {
  CreateLocationSchema,
  UpdateLocationSchema,
  UpdateDeliveryConfigSchema,
  UpdateReceiptConfigSchema,
  UpdateKdsConfigSchema,
  UpdateReceiptDefaultsSchema,
  UpdateKdsDefaultsSchema,
} from '../location';

// --- CreateLocationSchema ---

describe('CreateLocationSchema', () => {
  const validAddress = {
    street: 'Marszałkowska 1',
    city: 'Warszawa',
    postal_code: '00-001',
    country: 'PL',
    lat: 52.2297,
    lng: 21.0122,
  };

  const validData = {
    name: 'Food Truck Centrum',
    type: LocationType.FOOD_TRUCK,
    address: validAddress,
    phone: '+48 123 456 789',
    is_active: true,
  };

  it('validates complete valid data (all fields)', () => {
    const result = CreateLocationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Food Truck Centrum');
      expect(result.data.type).toBe(LocationType.FOOD_TRUCK);
      expect(result.data.address.street).toBe('Marszałkowska 1');
      expect(result.data.phone).toBe('+48 123 456 789');
      expect(result.data.is_active).toBe(true);
    }
  });

  it('rejects empty name', () => {
    const data = { ...validData, name: '' };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid location type', () => {
    const data = { ...validData, type: 'invalid_type' };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires address street', () => {
    const data = {
      ...validData,
      address: { ...validAddress, street: '' },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires address city', () => {
    const data = {
      ...validData,
      address: { ...validAddress, city: '' },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires address postal_code', () => {
    const data = {
      ...validData,
      address: { ...validAddress, postal_code: '' },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('defaults country to PL', () => {
    const { country: _country, ...addressWithoutCountry } = validAddress;
    const data = { ...validData, address: addressWithoutCountry };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.country).toBe('PL');
    }
  });

  it('defaults is_active to true', () => {
    const { is_active: _active, ...dataWithoutActive } = validData;
    const result = CreateLocationSchema.safeParse(dataWithoutActive);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });

  it('accepts phone as null', () => {
    const data = { ...validData, phone: null };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
    }
  });

  it('accepts phone as undefined (optional)', () => {
    const { phone: _phone, ...dataWithoutPhone } = validData;
    const result = CreateLocationSchema.safeParse(dataWithoutPhone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('accepts phone as string', () => {
    const data = { ...validData, phone: '555-1234' };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('555-1234');
    }
  });

  it('accepts lat as null', () => {
    const data = {
      ...validData,
      address: { ...validAddress, lat: null },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lat).toBeNull();
    }
  });

  it('accepts lat as undefined (optional)', () => {
    const { lat: _lat, ...addressWithoutLat } = validAddress;
    const data = { ...validData, address: addressWithoutLat };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lat).toBeUndefined();
    }
  });

  it('accepts lat as number', () => {
    const data = {
      ...validData,
      address: { ...validAddress, lat: 50.0647 },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lat).toBe(50.0647);
    }
  });

  it('accepts lng as null', () => {
    const data = {
      ...validData,
      address: { ...validAddress, lng: null },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lng).toBeNull();
    }
  });

  it('accepts lng as undefined (optional)', () => {
    const { lng: _lng, ...addressWithoutLng } = validAddress;
    const data = { ...validData, address: addressWithoutLng };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lng).toBeUndefined();
    }
  });

  it('accepts lng as number', () => {
    const data = {
      ...validData,
      address: { ...validAddress, lng: 19.945 },
    };
    const result = CreateLocationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.lng).toBe(19.945);
    }
  });
});

// --- UpdateLocationSchema ---

describe('UpdateLocationSchema', () => {
  it('all fields are optional (empty object is valid)', () => {
    const result = UpdateLocationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates name when provided', () => {
    const result = UpdateLocationSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('New Name');
    }
  });

  it('rejects empty name when provided', () => {
    const result = UpdateLocationSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('validates type when provided', () => {
    const result = UpdateLocationSchema.safeParse({ type: LocationType.KIOSK });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(LocationType.KIOSK);
    }
  });

  it('rejects invalid type when provided', () => {
    const result = UpdateLocationSchema.safeParse({ type: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('validates is_active when provided', () => {
    const result = UpdateLocationSchema.safeParse({ is_active: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(false);
    }
  });
});

// --- UpdateDeliveryConfigSchema ---

describe('UpdateDeliveryConfigSchema', () => {
  it('all fields are optional (empty object is valid)', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates delivery_radius_km at minimum (0.1)', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_radius_km: 0.1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delivery_radius_km).toBe(0.1);
    }
  });

  it('validates delivery_radius_km at maximum (100)', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_radius_km: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delivery_radius_km).toBe(100);
    }
  });

  it('rejects delivery_radius_km below 0.1', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_radius_km: 0.05 });
    expect(result.success).toBe(false);
  });

  it('rejects delivery_radius_km above 100', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_radius_km: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects negative delivery_fee', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_fee: -5 });
    expect(result.success).toBe(false);
  });

  it('accepts delivery_fee of 0', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ delivery_fee: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delivery_fee).toBe(0);
    }
  });

  it('validates time format HH:MM for opening_time', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ opening_time: '08:30' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.opening_time).toBe('08:30');
    }
  });

  it('validates time format HH:MM for closing_time', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ closing_time: '22:00' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.closing_time).toBe('22:00');
    }
  });

  it('rejects invalid time format for opening_time', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ opening_time: '8:30' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format (with seconds)', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ closing_time: '22:00:00' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format (text)', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ opening_time: 'morning' });
    expect(result.success).toBe(false);
  });

  it('validates pickup_time_min as positive integer', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ pickup_time_min: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pickup_time_min).toBe(5);
    }
  });

  it('rejects pickup_time_min less than 1', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ pickup_time_min: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer pickup_time_min', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ pickup_time_min: 2.5 });
    expect(result.success).toBe(false);
  });

  it('validates estimated_delivery_minutes as positive integer', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ estimated_delivery_minutes: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimated_delivery_minutes).toBe(30);
    }
  });

  it('rejects estimated_delivery_minutes less than 1', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ estimated_delivery_minutes: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts pickup_buffer_after_open as 0', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ pickup_buffer_after_open: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pickup_buffer_after_open).toBe(0);
    }
  });

  it('accepts ordering_paused_until_date as null', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({ ordering_paused_until_date: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ordering_paused_until_date).toBeNull();
    }
  });

  it('accepts ordering_paused_until_date in YYYY-MM-DD format', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({
      ordering_paused_until_date: '2026-03-20',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ordering_paused_until_date).toBe('2026-03-20');
    }
  });

  it('rejects ordering_paused_until_date in invalid format', () => {
    const result = UpdateDeliveryConfigSchema.safeParse({
      ordering_paused_until_date: '20-03-2026',
    });
    expect(result.success).toBe(false);
  });
});

// --- UpdateReceiptConfigSchema ---

describe('UpdateReceiptConfigSchema', () => {
  it('accepts all null values (null = use global)', () => {
    const data = {
      receipt_header: null,
      receipt_footer: null,
      print_automatically: null,
      show_logo: null,
    };
    const result = UpdateReceiptConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receipt_header).toBeNull();
      expect(result.data.receipt_footer).toBeNull();
      expect(result.data.print_automatically).toBeNull();
      expect(result.data.show_logo).toBeNull();
    }
  });

  it('accepts non-null values', () => {
    const data = {
      receipt_header: 'MESOpos',
      receipt_footer: 'Dziękujemy!',
      print_automatically: true,
      show_logo: false,
    };
    const result = UpdateReceiptConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receipt_header).toBe('MESOpos');
      expect(result.data.receipt_footer).toBe('Dziękujemy!');
      expect(result.data.print_automatically).toBe(true);
      expect(result.data.show_logo).toBe(false);
    }
  });

  it('validates string type for receipt_header', () => {
    const data = {
      receipt_header: 123,
      receipt_footer: null,
      print_automatically: null,
      show_logo: null,
    };
    const result = UpdateReceiptConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates boolean type for print_automatically', () => {
    const data = {
      receipt_header: null,
      receipt_footer: null,
      print_automatically: 'yes',
      show_logo: null,
    };
    const result = UpdateReceiptConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// --- UpdateKdsConfigSchema ---

describe('UpdateKdsConfigSchema', () => {
  it('accepts all null values', () => {
    const data = {
      alert_time_minutes: null,
      auto_accept_orders: null,
      sound_enabled: null,
      display_priority: null,
    };
    const result = UpdateKdsConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alert_time_minutes).toBeNull();
      expect(result.data.auto_accept_orders).toBeNull();
      expect(result.data.sound_enabled).toBeNull();
      expect(result.data.display_priority).toBeNull();
    }
  });

  it('validates alert_time_minutes as positive integer when not null', () => {
    const data = {
      alert_time_minutes: 5,
      auto_accept_orders: null,
      sound_enabled: null,
      display_priority: null,
    };
    const result = UpdateKdsConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alert_time_minutes).toBe(5);
    }
  });

  it('rejects alert_time_minutes less than 1 when not null', () => {
    const data = {
      alert_time_minutes: 0,
      auto_accept_orders: null,
      sound_enabled: null,
      display_priority: null,
    };
    const result = UpdateKdsConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer alert_time_minutes when not null', () => {
    const data = {
      alert_time_minutes: 2.5,
      auto_accept_orders: null,
      sound_enabled: null,
      display_priority: null,
    };
    const result = UpdateKdsConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts boolean nullables', () => {
    const data = {
      alert_time_minutes: null,
      auto_accept_orders: true,
      sound_enabled: false,
      display_priority: true,
    };
    const result = UpdateKdsConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auto_accept_orders).toBe(true);
      expect(result.data.sound_enabled).toBe(false);
      expect(result.data.display_priority).toBe(true);
    }
  });
});

// --- UpdateReceiptDefaultsSchema ---

describe('UpdateReceiptDefaultsSchema', () => {
  const validData = {
    header: 'MESOpos',
    footer: 'Dziękujemy za zakupy!',
    print_automatically: true,
    show_logo: true,
  };

  it('validates complete valid data', () => {
    const result = UpdateReceiptDefaultsSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.header).toBe('MESOpos');
      expect(result.data.footer).toBe('Dziękujemy za zakupy!');
      expect(result.data.print_automatically).toBe(true);
      expect(result.data.show_logo).toBe(true);
    }
  });

  it('rejects empty header', () => {
    const data = { ...validData, header: '' };
    const result = UpdateReceiptDefaultsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty footer', () => {
    const data = { ...validData, footer: '' };
    const result = UpdateReceiptDefaultsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires print_automatically boolean', () => {
    const { print_automatically: _p, ...dataWithout } = validData;
    const result = UpdateReceiptDefaultsSchema.safeParse(dataWithout);
    expect(result.success).toBe(false);
  });

  it('requires show_logo boolean', () => {
    const { show_logo: _s, ...dataWithout } = validData;
    const result = UpdateReceiptDefaultsSchema.safeParse(dataWithout);
    expect(result.success).toBe(false);
  });
});

// --- UpdateKdsDefaultsSchema ---

describe('UpdateKdsDefaultsSchema', () => {
  const validData = {
    alert_time_minutes: 10,
    auto_accept_orders: false,
    sound_enabled: true,
    display_priority: false,
  };

  it('validates complete valid data', () => {
    const result = UpdateKdsDefaultsSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alert_time_minutes).toBe(10);
      expect(result.data.auto_accept_orders).toBe(false);
      expect(result.data.sound_enabled).toBe(true);
      expect(result.data.display_priority).toBe(false);
    }
  });

  it('rejects alert_time_minutes less than 1', () => {
    const data = { ...validData, alert_time_minutes: 0 };
    const result = UpdateKdsDefaultsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer alert_time_minutes', () => {
    const data = { ...validData, alert_time_minutes: 3.5 };
    const result = UpdateKdsDefaultsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires auto_accept_orders boolean', () => {
    const { auto_accept_orders: _a, ...dataWithout } = validData;
    const result = UpdateKdsDefaultsSchema.safeParse(dataWithout);
    expect(result.success).toBe(false);
  });

  it('requires sound_enabled boolean', () => {
    const { sound_enabled: _s, ...dataWithout } = validData;
    const result = UpdateKdsDefaultsSchema.safeParse(dataWithout);
    expect(result.success).toBe(false);
  });

  it('requires display_priority boolean', () => {
    const { display_priority: _d, ...dataWithout } = validData;
    const result = UpdateKdsDefaultsSchema.safeParse(dataWithout);
    expect(result.success).toBe(false);
  });
});
