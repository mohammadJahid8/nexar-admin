/**
 * Migration script to fix cumulativeDays for existing users
 * 
 * Problem: When switching from lastBilledAt-based billing to cumulativeDays-based,
 * existing users had cumulativeDays = 0, causing double billing.
 * 
 * Solution: Calculate what cumulativeDays SHOULD be based on what was already billed
 * 
 * Run: node scripts/migrate-cumulative-days.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSeatSchema = new mongoose.Schema({
  businessId: mongoose.Schema.Types.ObjectId,
  externalUserId: String,
  activatedAt: Date,
  deactivatedAt: Date,
  lastBilledAt: Date,
  cumulativeDays: Number,
}, { timestamps: true });

const UserSeat = mongoose.model('UserSeat', UserSeatSchema);

const BusinessSchema = new mongoose.Schema({
  externalBusinessId: String,
  cumulativeSeatDays: Number,
});

const Business = mongoose.model('Business', BusinessSchema);

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Get all user seats
    const allSeats = await UserSeat.find({});
    console.log(`Found ${allSeats.length} user seat records\n`);

    const msPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();

    let totalFixed = 0;
    let totalDaysAdjusted = 0;

    for (const seat of allSeats) {
      const endDate = seat.deactivatedAt || now;

      // Calculate complete days since activation
      const totalDaysSinceActivation = Math.floor((endDate - seat.activatedAt) / msPerDay);

      // Current cumulative days (likely 0 or undefined)
      const currentCumulative = seat.cumulativeDays || 0;

      console.log(`User: ${seat.externalUserId}`);
      console.log(`  Activated: ${seat.activatedAt}`);
      console.log(`  Total days since activation: ${totalDaysSinceActivation}`);
      console.log(`  Current cumulativeDays: ${currentCumulative}`);

      // If cumulativeDays is less than what it should be, fix it
      if (currentCumulative < totalDaysSinceActivation) {
        const adjustment = totalDaysSinceActivation - currentCumulative;

        // But we also need to check if this was already billed via the old system
        // Since we billed 2 seat-days before (for users 1 & 2), and then 3 more (all 3 users)
        // We need to set cumulativeDays = totalDaysSinceActivation to prevent re-billing

        seat.cumulativeDays = totalDaysSinceActivation;
        await seat.save();

        console.log(`  FIXED: Set cumulativeDays to ${totalDaysSinceActivation}`);
        totalFixed++;
        totalDaysAdjusted += adjustment;
      } else {
        console.log(`  OK: Already correct`);
      }
      console.log('');
    }

    console.log('='.repeat(50));
    console.log(`Migration complete!`);
    console.log(`Fixed: ${totalFixed} records`);
    console.log(`Days adjusted: ${totalDaysAdjusted}`);
    console.log('='.repeat(50));

    // Also fix the business cumulativeSeatDays to match reality
    // The correct value should be: sum of all user cumulativeDays
    const businesses = await Business.find({});

    for (const business of businesses) {
      const seats = await UserSeat.find({ businessId: business._id });
      const correctCumulative = seats.reduce((sum, s) => sum + (s.cumulativeDays || 0), 0);

      console.log(`\nBusiness: ${business.externalBusinessId}`);
      console.log(`  Current cumulativeSeatDays: ${business.cumulativeSeatDays || 0}`);
      console.log(`  Correct cumulativeSeatDays: ${correctCumulative}`);

      if (business.cumulativeSeatDays !== correctCumulative) {
        business.cumulativeSeatDays = correctCumulative;
        await business.save();
        console.log(`  FIXED: Set to ${correctCumulative}`);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

migrate();
