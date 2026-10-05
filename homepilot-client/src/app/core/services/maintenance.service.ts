import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { CreateMaintenanceTaskPayload, MaintenanceTask } from '../models/maintenance.model';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<MaintenanceTask[]> {
    return this.http
      .get<ApiEnvelope<{ tasks: MaintenanceTask[] }>>(`${this.apiUrl}/homes/${homeId}/maintenance`)
      .pipe(map((res) => res.data.tasks));
  }

  create(homeId: string, payload: CreateMaintenanceTaskPayload): Observable<MaintenanceTask> {
    return this.http
      .post<ApiEnvelope<{ task: MaintenanceTask }>>(`${this.apiUrl}/homes/${homeId}/maintenance`, payload)
      .pipe(map((res) => res.data.task));
  }

  complete(taskId: string): Observable<MaintenanceTask> {
    return this.http
      .patch<ApiEnvelope<{ task: MaintenanceTask }>>(`${this.apiUrl}/maintenance/${taskId}/complete`, {})
      .pipe(map((res) => res.data.task));
  }

  remove(taskId: string): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.apiUrl}/maintenance/${taskId}`).pipe(map(() => undefined));
  }
}
