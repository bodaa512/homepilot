import { ServiceOffer, ServiceOfferStatus } from '../models/ServiceOffer';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { Provider } from '../models/Provider';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { NotFoundError, ValidationError } from '../errors/specificErrors';
import { assertHomeAccess } from './authorization.service';
import { NotificationService } from './notification.service';
import { NotificationType } from '../models/Notification';
import { ChatService } from './chat.service';

const OPEN_STATUSES = [ServiceRequestStatus.REQUESTED, ServiceRequestStatus.REVIEWING, ServiceRequestStatus.OFFERS_RECEIVED];

export const OfferService = {
  async submitOffer(userId: string, requestId: string, input: { price: number } & Record<string, unknown>) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) throw new ValidationError('Create a provider profile before submitting offers');

    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new NotFoundError('Service request not found');
    if (!OPEN_STATUSES.includes(request.status)) {
      throw new ValidationError('This request is no longer open for offers');
    }

    const offer = await ServiceOffer.create({ ...input, serviceRequest: requestId, provider: provider._id });

    if (request.status === ServiceRequestStatus.REQUESTED) {
      request.status = ServiceRequestStatus.OFFERS_RECEIVED;
      request.statusHistory.push({
        status: ServiceRequestStatus.OFFERS_RECEIVED,
        changedAt: new Date(),
        changedBy: userId as never,
      });
      await request.save();
    }

    await NotificationService.create({
      user: request.createdBy.toString(),
      type: NotificationType.SERVICE,
      title: `عرض جديد على "${request.title}"`,
      body: `${provider.businessName} قدّم عرضًا بقيمة ${offer.price} ${offer.currency}`,
      priority: 'medium',
      relatedEntityType: 'ServiceRequest',
      relatedEntityId: requestId,
      actionUrl: `/app/service-requests/${requestId}`,
    });

    // Opens the chat thread between the requester and this provider up front,
    // so a conversation exists the moment there's something to discuss.
    await ChatService.getOrCreateConversation(requestId, provider._id.toString(), [
      request.createdBy.toString(),
      userId,
    ]);

    return offer;
  },

  async listOffersForRequest(userId: string, requestId: string) {
    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new NotFoundError('Service request not found');
    await assertHomeAccess(userId, request.home.toString());

    return ServiceOffer.find({ serviceRequest: requestId })
      .populate('provider', 'businessName ratingAverage ratingCount verificationStatus')
      .sort({ price: 1 });
  },

  async acceptOffer(userId: string, offerId: string) {
    const offer = await ServiceOffer.findById(offerId).populate('provider');
    if (!offer) throw new NotFoundError('Offer not found');

    const request = await ServiceRequest.findById(offer.serviceRequest);
    if (!request) throw new NotFoundError('Service request not found');
    await assertHomeAccess(userId, request.home.toString(), 'service-requests:manage');

    offer.status = ServiceOfferStatus.ACCEPTED;
    await offer.save();

    await ServiceOffer.updateMany(
      { serviceRequest: request._id, _id: { $ne: offer._id } },
      { status: ServiceOfferStatus.REJECTED },
    );

    request.status = ServiceRequestStatus.SCHEDULED;
    request.selectedOffer = offer._id;
    request.statusHistory.push({ status: ServiceRequestStatus.SCHEDULED, changedAt: new Date(), changedBy: userId as never });
    await request.save();

    const provider = offer.provider as unknown as { _id: string; user: string; businessName: string };
    const appointment = await Appointment.create({
      serviceRequest: request._id,
      customer: request.createdBy,
      provider: provider._id,
      home: request.home,
      date: offer.proposedDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: AppointmentStatus.SCHEDULED,
    });

    await NotificationService.create({
      user: provider.user,
      type: NotificationType.SERVICE,
      title: `تم قبول عرضك على "${request.title}"`,
      body: `تم تحديد موعد في ${appointment.date.toLocaleDateString()}`,
      priority: 'high',
      relatedEntityType: 'ServiceRequest',
      relatedEntityId: request._id.toString(),
      actionUrl: `/app/service-requests/${request._id}`,
    });

    return { offer, request, appointment };
  },
};
