import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/:documentId/download', DocumentController.download);
router.delete('/:documentId', DocumentController.remove);

export default router;
