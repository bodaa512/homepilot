import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { AppNotification, NotificationListResponse } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  private readonly unreadSignal = signal(0);
  readonly unreadCount = this.unreadSignal.asReadonly();

  list(): Observable<AppNotification[]> {
    return this.http.get<ApiEnvelope<NotificationListResponse>>(this.base).pipe(
      tap((res) => this.unreadSignal.set(res.data.unreadCount)),
      map((res) => res.data.notifications),
    );
  }

  markRead(id: string): Observable<void> {
    return this.http.patch<ApiEnvelope<unknown>>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.unreadSignal.update((n) => Math.max(0, n - 1))),
      map(() => undefined),
    );
  }

  markAllRead(): Observable<void> {
    return this.http.patch<ApiEnvelope<null>>(`${this.base}/read-all`, {}).pipe(
      tap(() => this.unreadSignal.set(0)),
      map(() => undefined),
    );
  }

  reset(): void {
    this.unreadSignal.set(0);
  }
}
