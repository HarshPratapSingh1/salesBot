import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
    callId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    prospectName: String,
    prospectEmail: String,
    qualified: { type: Boolean, default: false },
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Lead', leadSchema);