export interface LocationAddressObject {
  street?: string
  city?: string
  postal_code?: string
  country?: string
}

export interface LocationAddressParts {
  street: string
  city: string
  postalCode: string
  country: string
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getLocationAddressParts(address: unknown): LocationAddressParts {
  if (typeof address === 'string') {
    return {
      street: address.trim(),
      city: '',
      postalCode: '',
      country: '',
    }
  }

  if (!address || typeof address !== 'object') {
    return {
      street: '',
      city: '',
      postalCode: '',
      country: '',
    }
  }

  const source = address as LocationAddressObject

  return {
    street: readString(source.street),
    city: readString(source.city),
    postalCode: readString(source.postal_code),
    country: readString(source.country),
  }
}
