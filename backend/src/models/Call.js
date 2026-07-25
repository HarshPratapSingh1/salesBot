import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'agent'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const callSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  roomUrl: String,
  messages: [messageSchema],
  transcript: { type: String, default: '' },
  language: { type: String, default: 'en' },
  duration: { type: Number, default: 0 },
  qualified: { type: Boolean, default: false },
  prospectEmail: { type: String, default: '' },
  prospectName: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Call', callSchema);