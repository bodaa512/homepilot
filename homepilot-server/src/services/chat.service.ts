import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { ServiceRequest } from '../models/ServiceRequest';
import { Provider } from '../models/Provider';
import { NotFoundError, AuthorizationError } from '../errors/specificErrors';
import { getIO } from '../config/socket';

export const ChatService = {
  async getOrCreateConversation(requestId: string, providerId: string, participants: string[]) {
    const existing = await Conversation.findOne({ serviceRequest: requestId, provider: providerId });
    if (existing) return existing;

    return Conversation.create({
      serviceRequest: requestId,
      provider: providerId,
      participants,
      context: 'service_request',
      lastMessageAt: new Date(),
    });
  },

  /** Verifies the caller is either a member of the request's home, or the provider on this thread. */
  async assertThreadAccess(userId: string, requestId: string, providerId: string) {
    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new NotFoundError('Service request not found');

    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    const isProviderUser = provider.user.toString() === userId;
    const isRequester = request.createdBy.toString() === userId;

    if (!isProviderUser && !isRequester) {
      // Other home members besides the requester can't see provider chats
      // in this phase — kept simple until a shared-inbox feature is needed.
      throw new AuthorizationError('You do not have access to this conversation');
    }

    return { request, provider };
  },

  async listMessages(userId: string, requestId: string, providerId: string) {
    await this.assertThreadAccess(userId, requestId, providerId);
    const conversation = await Conversation.findOne({ serviceRequest: requestId, provider: providerId });
    if (!conversation) return [];
    return Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  },

  async sendMessage(userId: string, requestId: string, providerId: string, text: string) {
    const { request, provider } = await this.assertThreadAccess(userId, requestId, providerId);

    const conversation = await this.getOrCreateConversation(requestId, providerId, [
      request.createdBy.toString(),
      provider.user.toString(),
    ]);

    const message = await Message.create({ conversation: conversation._id, sender: userId, text });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    getIO()?.to(`conversation:${conversation._id}`).emit('newMessage', message);

    return message;
  },
};
