import { RoomService } from '../services/room.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const RoomController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const rooms = await RoomService.listRooms(requireUserId(req), req.params.homeId);
    sendSuccess(res, { rooms });
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const room = await RoomService.createRoom(requireUserId(req), req.params.homeId, req.body);
    sendSuccess(res, { room }, 'Room created successfully', 201);
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const room = await RoomService.updateRoom(requireUserId(req), req.params.roomId, req.body);
    sendSuccess(res, { room }, 'Room updated successfully');
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await RoomService.deleteRoom(requireUserId(req), req.params.roomId);
    sendSuccess(res, null, 'Room deleted successfully');
  }),
};
