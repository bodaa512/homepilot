import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import {
  AssignTenantPayload,
  CreatePropertyPayload,
  Property,
  PropertyEntry,
  PropertyUnit,
} from '../models/property.model';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/properties`;

  list(): Observable<PropertyEntry[]> {
    return this.http
      .get<ApiEnvelope<{ properties: PropertyEntry[] }>>(this.base)
      .pipe(map((res) => res.data.properties));
  }

  create(payload: CreatePropertyPayload): Observable<Property> {
    return this.http
      .post<ApiEnvelope<{ property: Property }>>(this.base, payload)
      .pipe(map((res) => res.data.property));
  }

  units(propertyId: string): Observable<PropertyUnit[]> {
    return this.http
      .get<ApiEnvelope<{ units: PropertyUnit[] }>>(`${this.base}/${propertyId}/units`)
      .pipe(map((res) => res.data.units));
  }

  addUnit(propertyId: string, unitNumber: string): Observable<PropertyUnit> {
    return this.http
      .post<ApiEnvelope<{ unit: PropertyUnit }>>(`${this.base}/${propertyId}/units`, { unitNumber })
      .pipe(map((res) => res.data.unit));
  }

  assignTenant(unitId: string, payload: AssignTenantPayload): Observable<void> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.base}/units/${unitId}/tenant`, payload).pipe(map(() => undefined));
  }
}
