import cron from 'node-cron';
import Business from '../models/business.model.js';
import UserSeat from '../models/user-seat.model.js';
import { reportSeatDays } from '../services/stripe.service.js';


/**
 * Process daily billing for a single business
 * Handles BOTH active users AND recently deactivated users with unbilled days
 */
async function processDailyBilling(business) {
  try {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Get ALL users with unbilled days (active OR deactivated)
    const allSeats = await UserSeat.find({
      businessId: business._id,
      $or: [
        // Active users
        { deactivatedAt: null },
        // Deactivated users who still have unbilled days
        {
          deactivatedAt: { $ne: null },
          $expr: { $gt: ['$deactivatedAt', '$lastBilledAt'] }
        }
      ]
    });

    if (allSeats.length === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No users to bill, skipping`);
      return { skipped: true, reason: 'No users to bill' };
    }

    // Calculate per-user seat-days
    let seatDaysToReport = 0;
    let activeCount = 0;
    let deactivatedCount = 0;

    for (const seat of allSeats) {
      const startDate = seat.lastBilledAt || seat.activatedAt;
      // For deactivated users, bill up to deactivation date; for active, bill up to now
      const endDate = seat.deactivatedAt || now;
      const daysElapsed = Math.floor((endDate - startDate) / msPerDay);

      if (daysElapsed > 0) {
        seatDaysToReport += daysElapsed;
        if (seat.deactivatedAt) {
          deactivatedCount++;
        } else {
          activeCount++;
        }
      }
    }

    if (seatDaysToReport === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No days elapsed for any user, skipping`);
      return { skipped: true, reason: 'No days elapsed' };
    }

    // Report to Stripe
    await reportSeatDays(business.stripeSubscriptionItemId, seatDaysToReport);

    // Mark all seats as billed up to their appropriate end date
    for (const seat of allSeats) {
      const endDate = seat.deactivatedAt || now;
      if (!seat.lastBilledAt || endDate > seat.lastBilledAt) {
        seat.lastBilledAt = endDate;
        await seat.save();
      }
    }

    // Update business cumulative
    business.cumulativeSeatDays = (business.cumulativeSeatDays || 0) + seatDaysToReport;
    business.lastUsageSyncAt = now;
    await business.save();

    console.log(`[DailyBilling] ${business.externalBusinessId}: Reported ${seatDaysToReport} seat-days (${activeCount} active, ${deactivatedCount} deactivated users)`);

    return {
      success: true,
      seatDaysReported: seatDaysToReport,
      activeUsers: activeCount,
      deactivatedUsers: deactivatedCount,
    };
  } catch (err) {
    console.error(`[DailyBilling] ${business.externalBusinessId}: Error -`, err.message);
    return { error: err.message };
  }
}

/**
 * Run daily billing for all active businesses
 */
export async function runDailyBilling() {
  console.log('[DailyBilling] Starting daily billing run...');

  const activeBusinesses = await Business.find({
    billingStatus: 'active',
    stripeSubscriptionItemId: { $exists: true, $ne: null }
  });

  console.log(`[DailyBilling] Found ${activeBusinesses.length} active businesses`);

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalSeatDays: 0
  };

  for (const business of activeBusinesses) {
    const result = await processDailyBilling(business);

    if (result.error) {
      results.errors++;
    } else if (result.skipped) {
      results.skipped++;
    } else {
      results.processed++;
      results.totalSeatDays += result.seatDaysReported || 0;
    }
  }

  console.log(`[DailyBilling] Complete: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors, ${results.totalSeatDays} total seat-days`);

  return results;
}

/**
 * Initialize the daily billing cron job
 * Runs every day at midnight (00:00)
 */
export function initDailyBillingJob() {
  // Run at midnight UTC every day
  cron.schedule('0 0 * * *', async () => {
    console.log('[DailyBilling] Cron job triggered at', new Date().toISOString());
    await runDailyBilling();
  });

  console.log('[DailyBilling] Cron job scheduled to run at midnight UTC daily');
}
