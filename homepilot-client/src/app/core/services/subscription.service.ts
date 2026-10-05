import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { CreateSubscriptionPayload, Subscription, SubscriptionListResponse } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<SubscriptionListResponse> {
    return this.http
      .get<ApiEnvelope<SubscriptionListResponse>>(`${this.apiUrl}/homes/${homeId}/subscriptions`)
      .pipe(map((res) => res.data));
  }

  create(homeId: string, payload: CreateSubscriptionPayload): Observable<Subscription> {
    return this.http
      .post<ApiEnvelope<{ subscription: Subscription }>>(`${this.apiUrl}/homes/${homeId}/subscriptions`, payload)
      .pipe(map((res) => res.data.subscription));
  }

  setActive(subscriptionId: string, isActive: boolean): Observable<Subscription> {
    return this.http
      .put<ApiEnvelope<{ subscription: Subscription }>>(`${this.apiUrl}/subscriptions/${subscriptionId}`, {
        isActive,
      })
      .pipe(map((res) => res.data.subscription));
  }

  remove(subscriptionId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.apiUrl}/subscriptions/${subscriptionId}`)
      .pipe(map(() => undefined));
  }
}
