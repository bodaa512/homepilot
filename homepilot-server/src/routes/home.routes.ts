import { Router } from 'express';
import { HomeController } from '../controllers/home.controller';
import { RoomController } from '../controllers/room.controller';
import { AssetController } from '../controllers/asset.controller';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { ExpenseController } from '../controllers/expense.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import { ServiceRequestController } from '../controllers/serviceRequest.controller';
import { HomeInsightsController } from '../controllers/homeInsights.controller';
import { DocumentController } from '../controllers/document.controller';
import { CalendarController } from '../controllers/calendar.controller';
import { HomeMemoryController } from '../controllers/homeMemory.controller';
import { uploadDocument } from '../middleware/upload.middleware';
import { uploadDocumentMetaSchema } from '../validators/document.validators';
import { requireAuth } from '../middleware/auth.middleware';
import { requireHomeMembership, requireHomePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { createHomeSchema, inviteMemberSchema, updateHomeSchema } from '../validators/home.validators';
import { createRoomSchema } from '../validators/room.validators';
import { createAssetSchema } from '../validators/asset.validators';
import { createMaintenanceTaskSchema } from '../validators/maintenance.validators';
import { createExpenseSchema } from '../validators/expense.validators';
import { createSubscriptionSchema } from '../validators/subscription.validators';
import { createServiceRequestSchema } from '../validators/serviceRequest.validators';

const router = Router();

router.use(requireAuth);

router.get('/', HomeController.list);
router.post('/', validate(createHomeSchema), HomeController.create);

router.get('/:homeId', requireHomeMembership(), HomeController.getOne);
router.put('/:homeId', validate(updateHomeSchema), requireHomePermission('home:update'), HomeController.update);
router.delete('/:homeId', requireHomePermission('home:delete'), HomeController.remove);
router.get('/:homeId/summary', requireHomeMembership(), HomeController.summary);

router.get('/:homeId/members', requireHomeMembership(), HomeController.listMembers);
router.post(
  '/:homeId/members/invite',
  validate(inviteMemberSchema),
  requireHomePermission('members:manage'),
  HomeController.inviteMember,
);

router.get('/:homeId/rooms', requireHomeMembership(), RoomController.list);
router.post(
  '/:homeId/rooms',
  validate(createRoomSchema),
  requireHomePermission('assets:manage'),
  RoomController.create,
);

router.get('/:homeId/assets', requireHomeMembership(), AssetController.list);
router.post(
  '/:homeId/assets',
  validate(createAssetSchema),
  requireHomePermission('assets:manage'),
  AssetController.create,
);

router.get('/:homeId/maintenance', requireHomeMembership(), MaintenanceController.list);
router.post(
  '/:homeId/maintenance',
  validate(createMaintenanceTaskSchema),
  requireHomePermission('assets:manage'),
  MaintenanceController.create,
);

router.get('/:homeId/expenses', requireHomeMembership(), ExpenseController.list);
router.get('/:homeId/expenses/analytics', requireHomeMembership(), ExpenseController.analytics);
router.post(
  '/:homeId/expenses',
  validate(createExpenseSchema),
  requireHomePermission('expenses:manage'),
  ExpenseController.create,
);

router.get('/:homeId/subscriptions', requireHomeMembership(), SubscriptionController.list);
router.post(
  '/:homeId/subscriptions',
  validate(createSubscriptionSchema),
  requireHomePermission('expenses:manage'),
  SubscriptionController.create,
);

router.get('/:homeId/service-requests', requireHomeMembership(), ServiceRequestController.list);
router.post(
  '/:homeId/service-requests',
  validate(createServiceRequestSchema),
  requireHomeMembership(),
  ServiceRequestController.create,
);

router.get('/:homeId/health-score', requireHomeMembership(), HomeInsightsController.healthScore);
router.get('/:homeId/weekly-report', requireHomeMembership(), HomeInsightsController.weeklyReport);

router.get('/:homeId/documents', requireHomeMembership(), DocumentController.list);
router.post(
  '/:homeId/documents',
  requireHomePermission('assets:manage'),
  uploadDocument,
  validate(uploadDocumentMetaSchema),
  DocumentController.upload,
);

router.get('/:homeId/calendar', requireHomeMembership(), CalendarController.getEvents);
router.get('/:homeId/memory', requireHomeMembership(), HomeMemoryController.getMemory);

export default router;
