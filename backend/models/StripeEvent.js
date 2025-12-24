import mongoose from 'mongoose';

const stripeEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, 'Event ID is required'],
    unique: true,
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Event type is required'],
  },
  created: {
    type: Number,
    required: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
  error: {
    type: String,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
  },
});

// TTL index - auto-delete events after 90 days
stripeEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to check if event was already processed
stripeEventSchema.statics.isProcessed = async function (eventId) {
  const existing = await this.findOne({ eventId });
  return !!existing;
};

// Static method to mark event as processed
stripeEventSchema.statics.markProcessed = async function (eventId, type, created, businessId = null, error = null) {
  return this.create({
    eventId,
    type,
    created,
    businessId,
    error,
    processedAt: new Date(),
  });
};

const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema);

export default StripeEvent;
