import { Router } from 'express';
import { AchievementController } from '../controllers/achievement.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', AchievementController.listMine);

export default router;
