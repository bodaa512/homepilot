import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { CreateRoomPayload, Room } from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<Room[]> {
    return this.http
      .get<ApiEnvelope<{ rooms: Room[] }>>(`${this.apiUrl}/homes/${homeId}/rooms`)
      .pipe(map((res) => res.data.rooms));
  }

  create(homeId: string, payload: CreateRoomPayload): Observable<Room> {
    return this.http
      .post<ApiEnvelope<{ room: Room }>>(`${this.apiUrl}/homes/${homeId}/rooms`, payload)
      .pipe(map((res) => res.data.room));
  }

  remove(roomId: string): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.apiUrl}/rooms/${roomId}`).pipe(map(() => undefined));
  }
}
