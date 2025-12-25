import cron from 'node-cron';
import Business from '../models/business.model.js';
import UserSeat from '../models/user-seat.model.js';
import { reportSeatDays } from '../services/stripe.service.js';


/**
 * Process daily billing for a single business
 * Uses per-user (UserSeat) tracking for accurate billing
 */
async function processDailyBilling(business) {
  try {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Get active UserSeat records
    const activeSeats = await UserSeat.find({
      businessId: business._id,
      deactivatedAt: null,
    });

    if (activeSeats.length === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No active users, skipping`);
      return { skipped: true, reason: 'No active users' };
    }

    // Calculate per-user seat-days
    let seatDaysToReport = 0;
    for (const seat of activeSeats) {
      const startDate = seat.lastBilledAt || seat.activatedAt;
      const daysElapsed = Math.floor((now - startDate) / msPerDay);
      if (daysElapsed > 0) {
        seatDaysToReport += daysElapsed;
      }
    }

    if (seatDaysToReport === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No days elapsed for any user, skipping`);
      return { skipped: true, reason: 'No days elapsed' };
    }

    // Report to Stripe
    await reportSeatDays(business.stripeSubscriptionItemId, seatDaysToReport);

    // Mark all active seats as billed up to now
    await UserSeat.markDaysBilled(business._id, now);

    // Update business cumulative
    business.cumulativeSeatDays = (business.cumulativeSeatDays || 0) + seatDaysToReport;
    business.lastUsageSyncAt = now;
    await business.save();

    console.log(`[DailyBilling] ${business.externalBusinessId}: Reported ${seatDaysToReport} seat-days from ${activeSeats.length} users`);

    return {
      success: true,
      seatDaysReported: seatDaysToReport,
      userCount: activeSeats.length,
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
