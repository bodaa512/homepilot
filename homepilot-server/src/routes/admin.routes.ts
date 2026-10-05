import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireGlobalRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { setProviderVerificationSchema, setUserActiveSchema } from '../validators/admin.validators';
import { GlobalRole } from '../constants/roles';

const router = Router();

router.use(requireAuth, requireGlobalRole(GlobalRole.PLATFORM_ADMIN));

router.get('/users', AdminController.listUsers);
router.patch('/users/:userId/active', validate(setUserActiveSchema), AdminController.setUserActive);

router.get('/providers', AdminController.listProviders);
router.patch(
  '/providers/:providerId/verification',
  validate(setProviderVerificationSchema),
  AdminController.setProviderVerification,
);

router.get('/analytics', AdminController.analytics);
router.get('/audit-logs', AdminController.auditLogs);

export default router;
