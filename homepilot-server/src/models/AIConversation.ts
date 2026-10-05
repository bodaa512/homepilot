import { Schema, model, Document, Types } from 'mongoose';

export interface IAIConversation extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  home: Types.ObjectId;
  lastMessageAt: Date;
  createdAt: Date;
}

const aiConversationSchema = new Schema<IAIConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiConversationSchema.index({ user: 1, home: 1 }, { unique: true });

export const AIConversation = model<IAIConversation>('AIConversation', aiConversationSchema);

export interface IAIMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'AIConversation', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 8000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiMessageSchema.index({ conversation: 1, createdAt: 1 });

export const AIMessage = model<IAIMessage>('AIMessage', aiMessageSchema);
