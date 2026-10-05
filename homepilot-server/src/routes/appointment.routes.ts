import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', AppointmentController.listMine);
router.patch('/:appointmentId/status', AppointmentController.updateStatus);

export default router;
