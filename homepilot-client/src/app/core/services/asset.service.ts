import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { Asset, CreateAssetPayload } from '../models/asset.model';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<Asset[]> {
    return this.http
      .get<ApiEnvelope<{ assets: Asset[] }>>(`${this.apiUrl}/homes/${homeId}/assets`)
      .pipe(map((res) => res.data.assets));
  }

  create(homeId: string, payload: CreateAssetPayload): Observable<Asset> {
    return this.http
      .post<ApiEnvelope<{ asset: Asset }>>(`${this.apiUrl}/homes/${homeId}/assets`, payload)
      .pipe(map((res) => res.data.asset));
  }

  remove(assetId: string): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.apiUrl}/assets/${assetId}`).pipe(map(() => undefined));
  }
}
