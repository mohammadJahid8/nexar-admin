import mongoose from 'mongoose';

const userSeatSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true,
  },
  externalUserId: {
    type: String,
    required: [true, 'External user ID is required'],
    maxlength: [255, 'External user ID cannot exceed 255 characters'],
  },
  activatedAt: {
    type: Date,
    required: [true, 'Activation date is required'],
    default: Date.now,
  },
  deactivatedAt: {
    type: Date,
    default: null,
  },
  lastBilledAt: {
    type: Date,
    default: null,
  },
  cumulativeDays: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
userSeatSchema.index({ businessId: 1, externalUserId: 1 }, { unique: true });
userSeatSchema.index({ businessId: 1, deactivatedAt: 1 }); // For finding active seats

/**
 * Get all active seats for a business
 */
userSeatSchema.statics.getActiveSeats = async function (businessId) {
  return this.find({
    businessId,
    deactivatedAt: null,
  }).lean();
};

/**
 * Calculate total seat-days for a business
 * This calculates actual per-user days since activation or last billing
 */
userSeatSchema.statics.calculateSeatDays = async function (businessId, referenceDate = new Date()) {
  const activeSeats = await this.find({
    businessId,
    deactivatedAt: null,
  });

  let totalSeatDays = 0;
  const msPerDay = 24 * 60 * 60 * 1000;

  for (const seat of activeSeats) {
    const startDate = seat.lastBilledAt || seat.activatedAt;
    const daysElapsed = Math.floor((referenceDate - startDate) / msPerDay);
    if (daysElapsed > 0) {
      totalSeatDays += daysElapsed;
    }
  }

  return totalSeatDays;
};

/**
 * Calculate projected seat-days until period end
 */
userSeatSchema.statics.calculateProjectedSeatDays = async function (businessId, periodEnd) {
  const activeSeats = await this.find({
    businessId,
    deactivatedAt: null,
  });

  let totalProjectedDays = 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  const periodEndDate = new Date(periodEnd);

  for (const seat of activeSeats) {
    // Calculate from lastBilledAt (or activatedAt) to periodEnd
    const startDate = seat.lastBilledAt || seat.activatedAt;
    const daysUntilEnd = Math.floor((periodEndDate - startDate) / msPerDay);
    if (daysUntilEnd > 0) {
      totalProjectedDays += daysUntilEnd;
    }
  }

  return totalProjectedDays;
};

/**
 * Mark days as billed for all active seats
 */
userSeatSchema.statics.markDaysBilled = async function (businessId, billedUpTo = new Date()) {
  return this.updateMany(
    { businessId, deactivatedAt: null },
    { $set: { lastBilledAt: billedUpTo } }
  );
};

/**
 * Sync seats with a list of user IDs
 * Returns { added, removed, unchanged }
 */
userSeatSchema.statics.syncWithUserIds = async function (businessId, activeUserIds, _reason = null) {
  const now = new Date();
  const existingSeats = await this.find({ businessId });

  const _existingActiveIds = new Set(
    existingSeats
      .filter(s => !s.deactivatedAt)
      .map(s => s.externalUserId)
  );
  const incomingIds = new Set(activeUserIds);

  const added = [];
  const removed = [];
  const reactivated = [];
  const unchanged = [];

  // Find users to add or reactivate
  for (const userId of activeUserIds) {
    const existing = existingSeats.find(s => s.externalUserId === userId);

    if (!existing) {
      // New user - create seat
      await this.create({
        businessId,
        externalUserId: userId,
        activatedAt: now,
      });
      added.push(userId);
    } else if (existing.deactivatedAt) {
      // Previously deactivated - reactivate
      existing.deactivatedAt = null;
      existing.activatedAt = now; // Reset activation date
      existing.lastBilledAt = null;
      existing.cumulativeDays = 0;
      await existing.save();
      reactivated.push(userId);
    } else {
      unchanged.push(userId);
    }
  }

  // Find users to deactivate
  for (const seat of existingSeats) {
    if (!seat.deactivatedAt && !incomingIds.has(seat.externalUserId)) {
      seat.deactivatedAt = now;
      await seat.save();
      removed.push(seat.externalUserId);
    }
  }

  return {
    added,
    removed,
    reactivated,
    unchanged,
    totalActive: activeUserIds.length,
  };
};

const UserSeat = mongoose.model('UserSeat', userSeatSchema);

export default UserSeat;
