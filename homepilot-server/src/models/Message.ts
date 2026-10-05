import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  attachments: string[];
  readBy: Types.ObjectId[];
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 4000 },
    attachments: { type: [String], default: [] },
    readBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Powers "load this conversation's messages, oldest first" — the only query shape a chat thread needs.
messageSchema.index({ conversation: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
