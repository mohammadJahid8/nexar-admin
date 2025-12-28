import cron from 'node-cron';
import Business from '../models/business.model.js';
import UserSeat from '../models/user-seat.model.js';
import { reportSeatDays } from '../services/stripe.service.js';


/**
 * Process daily billing for a single business
 * Bills for COMPLETE 24-hour periods since each user's activation time
 * 
 * Example: User activated Dec 27 at 7:21 PM
 * - Dec 28 at 7:20 PM → 0 complete days (23h 59m)
 * - Dec 28 at 7:21 PM → 1 complete day (24h 0m)
 * - Dec 29 at 7:21 PM → 2 complete days (48h 0m)
 */
async function processDailyBilling(business) {
  try {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Get ALL users (active AND deactivated)
    const allSeats = await UserSeat.find({
      businessId: business._id,
      $or: [
        { deactivatedAt: null },
        { deactivatedAt: { $ne: null } }
      ]
    });

    if (allSeats.length === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No users to bill, skipping`);
      return { skipped: true, reason: 'No users to bill' };
    }

    let seatDaysToReport = 0;
    let activeCount = 0;
    let deactivatedCount = 0;
    const billedUsers = [];

    for (const seat of allSeats) {
      // Determine the end date for billing
      const endDate = seat.deactivatedAt || now;

      // Calculate COMPLETE 24-hour days since activation
      const totalDaysSinceActivation = Math.floor((endDate - seat.activatedAt) / msPerDay);

      // How many days have we already billed?
      const alreadyBilled = seat.cumulativeDays || 0;

      // Days to bill now = new complete days since last billing
      const daysToBill = totalDaysSinceActivation - alreadyBilled;

      if (daysToBill > 0) {
        seatDaysToReport += daysToBill;

        // Update the seat's cumulative billed days
        seat.cumulativeDays = totalDaysSinceActivation;
        seat.lastBilledAt = now;
        await seat.save();

        billedUsers.push({
          userId: seat.externalUserId,
          daysBilled: daysToBill,
          totalDays: totalDaysSinceActivation,
          activatedAt: seat.activatedAt
        });

        if (seat.deactivatedAt) {
          deactivatedCount++;
        } else {
          activeCount++;
        }
      }
    }

    if (seatDaysToReport === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No complete days to bill yet, skipping`);
      return { skipped: true, reason: 'No complete 24-hour periods yet' };
    }

    // Report to Stripe
    await reportSeatDays(business.stripeSubscriptionItemId, seatDaysToReport);

    // Update business cumulative
    business.cumulativeSeatDays = (business.cumulativeSeatDays || 0) + seatDaysToReport;
    business.lastUsageSyncAt = now;
    await business.save();

    console.log(`[DailyBilling] ${business.externalBusinessId}: Reported ${seatDaysToReport} seat-days (${activeCount} active, ${deactivatedCount} deactivated users)`);
    console.log(`[DailyBilling] Billed users:`, JSON.stringify(billedUsers, null, 2));

    return {
      success: true,
      seatDaysReported: seatDaysToReport,
      activeUsers: activeCount,
      deactivatedUsers: deactivatedCount,
      billedUsers
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
 * 
 * TESTING: Currently set to every 2 minutes for testing
 * PRODUCTION: Change to '0 * * * *' (every hour) before going live
 */
export function initDailyBillingJob() {
  // TESTING: Run every 2 minutes for quick testing
  // PRODUCTION: Change to '0 * * * *' (every hour)
  cron.schedule('*/2 * * * *', async () => {
    console.log('[DailyBilling] Cron job triggered at', new Date().toISOString());
    await runDailyBilling();
  });

  console.log('[DailyBilling] Cron job scheduled to run every 2 minutes (TESTING MODE)');
}

