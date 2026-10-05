import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { aiChatSchema, repairVsReplaceSchema } from '../validators/ai.validators';

const router = Router();

router.use(requireAuth);
router.post('/chat', validate(aiChatSchema), AIController.chat);
router.get('/chat/:homeId', AIController.history);
router.post('/repair-vs-replace', validate(repairVsReplaceSchema), AIController.repairVsReplace);

export default router;
