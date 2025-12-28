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
 * Calculate total UNBILLED seat-days for a business
 * Bills for COMPLETE 24-hour periods since each user's activation
 */
userSeatSchema.statics.calculateSeatDays = async function (businessId, referenceDate = new Date()) {
  const seats = await this.find({
    businessId,
    $or: [
      { deactivatedAt: null },
      { deactivatedAt: { $ne: null } }
    ]
  });

  let totalSeatDays = 0;
  const msPerDay = 24 * 60 * 60 * 1000;

  for (const seat of seats) {
    const endDate = seat.deactivatedAt || referenceDate;

    // Calculate complete 24-hour days since activation
    const totalDaysSinceActivation = Math.floor((endDate - seat.activatedAt) / msPerDay);

    // Subtract already billed days
    const alreadyBilled = seat.cumulativeDays || 0;
    const unbilledDays = totalDaysSinceActivation - alreadyBilled;

    if (unbilledDays > 0) {
      totalSeatDays += unbilledDays;
    }
  }

  return totalSeatDays;
};

/**
 * Calculate projected seat-days until period end
 * Uses COMPLETE 24-hour periods from each user's activation time
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
    // Calculate complete 24-hour days from activation to period end
    const daysUntilEnd = Math.floor((periodEndDate - new Date(seat.activatedAt)) / msPerDay);
    if (daysUntilEnd > 0) {
      totalProjectedDays += daysUntilEnd;
    }
  }

  return totalProjectedDays;
};

/**
 * Mark days as billed for all seats with unbilled days
 * Updates both lastBilledAt AND cumulativeDays for consistency
 */
userSeatSchema.statics.markDaysBilled = async function (businessId, billedUpTo = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;

  // Get all seats and update cumulativeDays
  const allSeats = await this.find({
    businessId,
    $or: [
      { deactivatedAt: null },
      { deactivatedAt: { $ne: null } }
    ]
  });

  let activeUpdated = 0;
  let deactivatedUpdated = 0;

  for (const seat of allSeats) {
    const endDate = seat.deactivatedAt || billedUpTo;
    const totalDaysSinceActivation = Math.floor((endDate - seat.activatedAt) / msPerDay);
    const currentCumulative = seat.cumulativeDays || 0;

    // Only update if there are new days to bill
    if (totalDaysSinceActivation > currentCumulative) {
      seat.cumulativeDays = totalDaysSinceActivation;
      seat.lastBilledAt = endDate;
      await seat.save();

      if (seat.deactivatedAt) {
        deactivatedUpdated++;
      } else {
        activeUpdated++;
      }
    }
  }

  return { activeUpdated, deactivatedUpdated };
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
