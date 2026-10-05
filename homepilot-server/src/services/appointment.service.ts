import { Appointment, AppointmentStatus } from '../models/Appointment';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { Provider } from '../models/Provider';
import { NotFoundError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { NotificationService } from './notification.service';
import { NotificationType } from '../models/Notification';

export const AppointmentService = {
  async listForCustomer(userId: string) {
    return Appointment.find({ customer: userId }).populate('provider', 'businessName').sort({ date: 1 });
  },

  async listForProvider(userId: string) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) return [];
    return Appointment.find({ provider: provider._id }).populate('home', 'name').sort({ date: 1 });
  },

  async updateStatus(userId: string, appointmentId: string, status: AppointmentStatus) {
    const appointment = await Appointment.findById(appointmentId).populate('provider');
    if (!appointment) throw new NotFoundError('Appointment not found');

    const provider = appointment.provider as unknown as { user: string };
    const isProviderUser = provider.user.toString() === userId;

    if (!isProviderUser) {
      // Fall back to home-membership authorization for the customer side.
      await assertHomeAccess(userId, appointment.home.toString(), 'service-requests:manage');
    }

    appointment.status = status;
    await appointment.save();

    if (status === AppointmentStatus.COMPLETED) {
      const request = await ServiceRequest.findById(appointment.serviceRequest);
      if (request) {
        request.status = ServiceRequestStatus.COMPLETED;
        request.statusHistory.push({ status: ServiceRequestStatus.COMPLETED, changedAt: new Date(), changedBy: userId as never });
        await request.save();

        await NotificationService.create({
          user: request.createdBy.toString(),
          type: NotificationType.SERVICE,
          title: `اكتمل العمل على "${request.title}"`,
          body: 'يمكنك الآن تقييم مقدم الخدمة.',
          priority: 'medium',
          relatedEntityType: 'ServiceRequest',
          relatedEntityId: request._id.toString(),
          actionUrl: `/app/service-requests/${request._id}`,
        });
      }
    }

    return appointment;
  },
};

// Re-export for controllers that only need the enum without importing the model directly.
export { AppointmentStatus };
