import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { CheckoutResult, PaymentRecord, Plan, PlanCode } from '../models/billing.model';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments`;

  plans(): Observable<Plan[]> {
    return this.http.get<ApiEnvelope<{ plans: Plan[] }>>(`${this.base}/plans`).pipe(map((res) => res.data.plans));
  }

  history(): Observable<PaymentRecord[]> {
    return this.http
      .get<ApiEnvelope<{ payments: PaymentRecord[] }>>(`${this.base}/history`)
      .pipe(map((res) => res.data.payments));
  }

  /** بيرجّع رابط صفحة الدفع بتاعة Stripe — الفرونت بيحوّل المستخدم عليه. */
  checkout(planCode: Exclude<PlanCode, 'free'>): Observable<CheckoutResult> {
    return this.http
      .post<ApiEnvelope<CheckoutResult>>(`${this.base}/checkout`, { planCode })
      .pipe(map((res) => res.data));
  }
}
