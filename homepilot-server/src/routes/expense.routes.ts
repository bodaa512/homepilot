import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateExpenseSchema } from '../validators/expense.validators';

const router = Router();

router.use(requireAuth);
router.put('/:expenseId', validate(updateExpenseSchema), ExpenseController.update);
router.delete('/:expenseId', ExpenseController.remove);

export default router;
