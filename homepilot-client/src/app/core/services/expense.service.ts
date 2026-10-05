import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { CreateExpensePayload, Expense, ExpenseAnalytics } from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string, range?: { from: string; to: string }): Observable<Expense[]> {
    let params = new HttpParams();
    if (range) params = params.set('from', range.from).set('to', range.to);
    return this.http
      .get<ApiEnvelope<{ expenses: Expense[] }>>(`${this.apiUrl}/homes/${homeId}/expenses`, { params })
      .pipe(map((res) => res.data.expenses));
  }

  analytics(homeId: string): Observable<ExpenseAnalytics> {
    return this.http
      .get<ApiEnvelope<ExpenseAnalytics>>(`${this.apiUrl}/homes/${homeId}/expenses/analytics`)
      .pipe(map((res) => res.data));
  }

  create(homeId: string, payload: CreateExpensePayload): Observable<Expense> {
    return this.http
      .post<ApiEnvelope<{ expense: Expense }>>(`${this.apiUrl}/homes/${homeId}/expenses`, payload)
      .pipe(map((res) => res.data.expense));
  }

  remove(expenseId: string): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.apiUrl}/expenses/${expenseId}`).pipe(map(() => undefined));
  }
}
