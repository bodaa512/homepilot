import { AppointmentService } from '../services/appointment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const AppointmentController = {
  listMine: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const asProvider = req.query.as === 'provider';
    const appointments = asProvider
      ? await AppointmentService.listForProvider(requireUserId(req))
      : await AppointmentService.listForCustomer(requireUserId(req));
    sendSuccess(res, { appointments });
  }),

  updateStatus: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const appointment = await AppointmentService.updateStatus(
      requireUserId(req),
      req.params.appointmentId,
      req.body.status,
    );
    sendSuccess(res, { appointment }, 'Appointment updated');
  }),
};
