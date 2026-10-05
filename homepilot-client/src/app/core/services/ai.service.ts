import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { AIChatMessage, RepairVsReplaceInput, RepairVsReplaceResult } from '../models/ai.model';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai`;

  history(homeId: string): Observable<AIChatMessage[]> {
    return this.http
      .get<ApiEnvelope<{ messages: AIChatMessage[] }>>(`${this.base}/chat/${homeId}`)
      .pipe(map((res) => res.data.messages));
  }

  /** بيرجّع رد المساعد بس (رسالة المستخدم بتتخزّن على السيرفر). */
  chat(homeId: string, message: string): Observable<AIChatMessage> {
    return this.http
      .post<ApiEnvelope<{ message: AIChatMessage }>>(`${this.base}/chat`, { homeId, message })
      .pipe(map((res) => res.data.message));
  }

  repairVsReplace(input: RepairVsReplaceInput): Observable<RepairVsReplaceResult> {
    return this.http
      .post<ApiEnvelope<RepairVsReplaceResult>>(`${this.base}/repair-vs-replace`, input)
      .pipe(map((res) => res.data));
  }
}
