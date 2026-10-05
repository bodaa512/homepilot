import { PaymentService } from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError, PaymentError } from '../errors/specificErrors';
import { Request, Response } from 'express';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const PaymentController = {
  listPlans: asyncHandler(async (_req, res) => {
    const plans = await PaymentService.listPlans();
    sendSuccess(res, { plans });
  }),

  checkout: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await PaymentService.createCheckoutSession(requireUserId(req), req.body.planCode);
    sendSuccess(res, result);
  }),

  history: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payments = await PaymentService.listHistory(requireUserId(req));
    sendSuccess(res, { payments });
  }),

  // Not wrapped in asyncHandler's JSON-response pattern deliberately — Stripe
  // expects a bare 200, and errors here must never leak internal details.
  webhook: async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    if (!signature) {
      res.status(400).send('Missing signature');
      return;
    }
    try {
      await PaymentService.handleWebhook(req.body as Buffer, signature);
      res.status(200).json({ received: true });
    } catch (error) {
      const message = error instanceof PaymentError ? error.message : 'Webhook processing failed';
      res.status(400).json({ received: false, message });
    }
  },
};
