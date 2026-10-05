import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateMaintenanceTaskSchema } from '../validators/maintenance.validators';

const router = Router();

router.use(requireAuth);
router.put('/:taskId', validate(updateMaintenanceTaskSchema), MaintenanceController.update);
router.patch('/:taskId/complete', MaintenanceController.complete);
router.delete('/:taskId', MaintenanceController.remove);

export default router;
