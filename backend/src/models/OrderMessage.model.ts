import mongoose, { Document, Schema, Types } from 'mongoose';

export type MessageSenderRole = 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'ADMIN';

export interface IOrderMessage extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  sender: Types.ObjectId;
  senderName: string;
  senderRole: MessageSenderRole;
  message: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderMessageSchema = new Schema<IOrderMessage>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: ['FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', 'DELIVERY_BOY', 'ADMIN'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

OrderMessageSchema.index({ order: 1, createdAt: 1 });

export const OrderMessage = mongoose.model<IOrderMessage>('OrderMessage', OrderMessageSchema);
