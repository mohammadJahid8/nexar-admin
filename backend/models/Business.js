import mongoose from 'mongoose';

const BILLING_STATUSES = ['not_enabled', 'pending_checkout', 'active', 'past_due', 'canceled'];

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [200, 'Business name cannot exceed 200 characters'],
    },
    externalBusinessId: {
      type: String,
      required: [true, 'External business ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_-]+$/, 'External business ID can only contain lowercase letters, numbers, hyphens, and underscores'],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    seatPriceAudCents: {
      type: Number,
      required: [true, 'Seat price is required'],
      min: [0, 'Seat price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Seat price must be an integer (cents)',
      },
    },
    currency: {
      type: String,
      default: 'aud',
      enum: ['aud'],
      lowercase: true,
    },
    apiKey: {
      type: String,
      required: [true, 'API key is required'],
      select: false, // Don't return by default in queries
    },
    billingStatus: {
      type: String,
      enum: BILLING_STATUSES,
      default: 'not_enabled',
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionItemId: {
      type: String,
      sparse: true,
    },
    currentSeatCount: {
      type: Number,
      default: 1,
      min: [1, 'Seat count must be at least 1 (super admin)'],
    },
    cumulativeSeatDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    billingEnabledAt: {
      type: Date,
    },
    lastUsageSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
// businessSchema.index({ externalBusinessId: 1 });
// businessSchema.index({ stripeCustomerId: 1 });
// businessSchema.index({ stripeSubscriptionId: 1 });
// businessSchema.index({ billingStatus: 1 });

// Virtual for formatted seat price
businessSchema.virtual('seatPriceAud').get(function () {
  return (this.seatPriceAudCents / 100).toFixed(2);
});

// Static method to find by external ID
businessSchema.statics.findByExternalId = function (externalBusinessId) {
  return this.findOne({ externalBusinessId: externalBusinessId.toLowerCase() });
};

// Static method to find by external ID with API key
businessSchema.statics.findByExternalIdWithApiKey = function (externalBusinessId) {
  return this.findOne({ externalBusinessId: externalBusinessId.toLowerCase() }).select('+apiKey');
};

// Instance method to check if billing is active
businessSchema.methods.isBillingActive = function () {
  return this.billingStatus === 'active';
};

// Instance method to check if can create checkout session
businessSchema.methods.canCreateCheckoutSession = function () {
  return ['not_enabled', 'canceled'].includes(this.billingStatus);
};

// JSON serialization - remove sensitive fields
businessSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.apiKey;
    delete ret.__v;
    return ret;
  },
});

const Business = mongoose.model('Business', businessSchema);

export default Business;
