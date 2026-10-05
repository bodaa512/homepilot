/** يطابق IRoom في السيرفر (models/Room.ts). */
export interface Room {
  _id: string;
  home: string;
  name: string;
  type?: string;
  notes?: string;
}

export interface CreateRoomPayload {
  name: string;
  type?: string;
}
