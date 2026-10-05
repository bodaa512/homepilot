import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import {
  ChatMessage,
  CreateReviewPayload,
  CreateServiceRequestPayload,
  ServiceOffer,
  ServiceRequest,
} from '../models/service-request.model';

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listForHome(homeId: string): Observable<ServiceRequest[]> {
    return this.http
      .get<ApiEnvelope<{ requests: ServiceRequest[] }>>(`${this.apiUrl}/homes/${homeId}/service-requests`)
      .pipe(map((res) => res.data.requests));
  }

  create(homeId: string, payload: CreateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http
      .post<ApiEnvelope<{ request: ServiceRequest }>>(`${this.apiUrl}/homes/${homeId}/service-requests`, payload)
      .pipe(map((res) => res.data.request));
  }

  getOne(requestId: string): Observable<ServiceRequest> {
    return this.http
      .get<ApiEnvelope<{ request: ServiceRequest }>>(`${this.apiUrl}/service-requests/${requestId}`)
      .pipe(map((res) => res.data.request));
  }

  cancel(requestId: string): Observable<ServiceRequest> {
    return this.http
      .patch<ApiEnvelope<{ request: ServiceRequest }>>(`${this.apiUrl}/service-requests/${requestId}/cancel`, {})
      .pipe(map((res) => res.data.request));
  }

  listOffers(requestId: string): Observable<ServiceOffer[]> {
    return this.http
      .get<ApiEnvelope<{ offers: ServiceOffer[] }>>(`${this.apiUrl}/service-requests/${requestId}/offers`)
      .pipe(map((res) => res.data.offers));
  }

  acceptOffer(offerId: string): Observable<void> {
    return this.http.patch<ApiEnvelope<unknown>>(`${this.apiUrl}/offers/${offerId}/accept`, {}).pipe(map(() => undefined));
  }

  createReview(requestId: string, payload: CreateReviewPayload): Observable<void> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.apiUrl}/service-requests/${requestId}/review`, payload)
      .pipe(map(() => undefined));
  }

  listMessages(requestId: string, providerId: string): Observable<ChatMessage[]> {
    return this.http
      .get<ApiEnvelope<{ messages: ChatMessage[] }>>(
        `${this.apiUrl}/service-requests/${requestId}/providers/${providerId}/messages`,
      )
      .pipe(map((res) => res.data.messages));
  }

  sendMessage(requestId: string, providerId: string, text: string): Observable<ChatMessage> {
    return this.http
      .post<ApiEnvelope<{ message: ChatMessage }>>(
        `${this.apiUrl}/service-requests/${requestId}/providers/${providerId}/messages`,
        { text },
      )
      .pipe(map((res) => res.data.message));
  }
}
