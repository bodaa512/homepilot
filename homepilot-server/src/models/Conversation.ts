import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  context: 'service_request' | 'tenant_owner' | 'support';
  serviceRequest?: Types.ObjectId;
  provider?: Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    context: { type: String, enum: ['service_request', 'tenant_owner', 'support'], required: true },
    serviceRequest: { type: Schema.Types.ObjectId, ref: 'ServiceRequest' },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

// One chat thread per (service request, provider) pair — the shape every
// lookup and the uniqueness guarantee both need.
conversationSchema.index({ serviceRequest: 1, provider: 1 }, { unique: true, sparse: true });
conversationSchema.index({ participants: 1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
