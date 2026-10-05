/** يطابق IProperty/IPropertyUnit/ITenant في السيرفر. */
export interface Property {
  _id: string;
  name: string;
  address?: string;
  city?: string;
}

/** عنصر من رد GET /properties (services/property.service.ts → listMyProperties). */
export interface PropertyEntry {
  property: Property;
  totalUnits: number;
  occupiedUnits: number;
}

export interface PropertyUnit {
  _id: string;
  unitNumber: string;
  status: 'occupied' | 'vacant';
  home: { _id: string; name: string } | null;
}

export interface CreatePropertyPayload {
  name: string;
  address?: string;
  city?: string;
}

export interface AssignTenantPayload {
  email: string;
  leaseStart?: string;
  leaseEnd?: string;
  rentAmount?: number;
}
