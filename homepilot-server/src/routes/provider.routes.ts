import { Router } from 'express';
import { ProviderController } from '../controllers/provider.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProviderSchema, updateProviderSchema } from '../validators/provider.validators';

const router = Router();

router.use(requireAuth);
router.post('/', validate(createProviderSchema), ProviderController.upsertOwnProfile);
router.put('/', validate(updateProviderSchema), ProviderController.upsertOwnProfile);
router.get('/me', ProviderController.getOwnProfile);
router.get('/requests/open', ProviderController.listOpenRequests);

export default router;
