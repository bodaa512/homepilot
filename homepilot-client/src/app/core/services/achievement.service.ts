import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { Achievement } from '../models/achievement.model';

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(): Observable<Achievement[]> {
    return this.http
      .get<ApiEnvelope<{ achievements: Achievement[] }>>(`${this.apiUrl}/achievements`)
      .pipe(map((res) => res.data.achievements));
  }
}
