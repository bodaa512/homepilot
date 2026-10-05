import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateRoomSchema } from '../validators/room.validators';

const router = Router();

router.use(requireAuth);
router.put('/:roomId', validate(updateRoomSchema), RoomController.update);
router.delete('/:roomId', RoomController.remove);

export default router;
