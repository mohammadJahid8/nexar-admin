import mongoose from 'mongoose';

const seatEventLogSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true,
  },
  delta: {
    type: Number,
    required: [true, 'Delta is required'],
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  externalActor: {
    type: String,
    default: 'crm-sync',
    maxlength: [100, 'External actor cannot exceed 100 characters'],
  },
  resultingSeatCount: {
    type: Number,
    required: [true, 'Resulting seat count is required'],
    min: [0, 'Resulting seat count cannot be negative'],
  },
});

// Compound index for efficient queries
seatEventLogSchema.index({ businessId: 1, at: -1 });

// Static method to log a seat change
seatEventLogSchema.statics.logChange = async function (businessId, previousCount, newCount, reason = null, externalActor = 'crm-sync') {
  const delta = newCount - previousCount;

  return this.create({
    businessId,
    delta,
    reason,
    externalActor,
    resultingSeatCount: newCount,
    at: new Date(),
  });
};

const SeatEventLog = mongoose.model('SeatEventLog', seatEventLogSchema);

export default SeatEventLog;
