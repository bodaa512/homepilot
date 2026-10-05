import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { HomeMemoryEntry } from '../models/home-memory.model';

@Injectable({ providedIn: 'root' })
export class HomeMemoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<HomeMemoryEntry[]> {
    return this.http
      .get<ApiEnvelope<{ entries: HomeMemoryEntry[] }>>(`${this.apiUrl}/homes/${homeId}/memory`)
      .pipe(map((res) => res.data.entries));
  }
}
