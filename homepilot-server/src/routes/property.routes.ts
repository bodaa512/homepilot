import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { addUnitSchema, assignTenantSchema, createPropertySchema } from '../validators/property.validators';

const router = Router();

router.use(requireAuth);
router.post('/', validate(createPropertySchema), PropertyController.create);
router.get('/', PropertyController.list);
router.get('/:propertyId/units', PropertyController.listUnits);
router.post('/:propertyId/units', validate(addUnitSchema), PropertyController.addUnit);
router.post('/units/:unitId/tenant', validate(assignTenantSchema), PropertyController.assignTenant);

export default router;
