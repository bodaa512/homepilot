import { Room, IRoom } from '../models/Room';
import { Asset } from '../models/Asset';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';

export const RoomService = {
  async listRooms(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    return Room.find({ home: homeId }).sort({ createdAt: 1 });
  },

  async createRoom(userId: string, homeId: string, input: Pick<IRoom, 'name'> & Partial<IRoom>) {
    await assertHomeAccess(userId, homeId, 'assets:manage');
    return Room.create({ ...input, home: homeId });
  },

  async updateRoom(userId: string, roomId: string, updates: Partial<IRoom>) {
    const room = await Room.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    await assertHomeAccess(userId, room.home.toString(), 'assets:manage');

    Object.assign(room, updates);
    await room.save();
    return room;
  },

  async deleteRoom(userId: string, roomId: string) {
    const room = await Room.findById(roomId);
    if (!room) throw new NotFoundError('Room not found');

    await assertHomeAccess(userId, room.home.toString(), 'assets:manage');

    const assetsInRoom = await Asset.countDocuments({ room: roomId });
    if (assetsInRoom > 0) {
      throw new ValidationError('Move or remove the assets in this room before deleting it');
    }

    await room.deleteOne();
  },
};
