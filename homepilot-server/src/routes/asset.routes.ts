import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateAssetSchema } from '../validators/asset.validators';

const router = Router();

router.use(requireAuth);
router.get('/:assetId', AssetController.getOne);
router.put('/:assetId', validate(updateAssetSchema), AssetController.update);
router.delete('/:assetId', AssetController.remove);

export default router;
