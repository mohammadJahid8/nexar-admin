import cron from 'node-cron';
import Business from '../models/Business.js';
import { reportSeatDays } from '../services/stripeService.js';
import { daysBetween } from '../utils/daysBetween.js';


/**
 * Process daily billing for a single business
 */
async function processDailyBilling(business) {
  try {
    const now = new Date();
    // now time is 22dec 11:30pm
    // const now = new Date('2025-12-22T23:30:00.000Z');
    const lastSync = business.lastUsageSyncAt || business.billingEnabledAt || now;
    const daysElapsed = daysBetween(lastSync, now);

    if (daysElapsed === 0) {
      console.log(`[DailyBilling] ${business.externalBusinessId}: No days elapsed, skipping`);
      return { skipped: true };
    }

    const seatDaysToReport = business.currentSeatCount * daysElapsed;

    if (seatDaysToReport > 0) {
      await reportSeatDays(business.stripeSubscriptionItemId, seatDaysToReport);

      business.cumulativeSeatDays = (business.cumulativeSeatDays || 0) + seatDaysToReport;
      business.lastUsageSyncAt = now;
      await business.save();

      console.log(`[DailyBilling] ${business.externalBusinessId}: Reported ${seatDaysToReport} seat-days (${business.currentSeatCount} seats × ${daysElapsed} days)`);

      return {
        success: true,
        seatDaysReported: seatDaysToReport,
        daysElapsed
      };
    }

    return { skipped: true, reason: 'No usage to report' };
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
