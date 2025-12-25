/**
 * Seed Script - Create initial super_admin user
 * 
 * Usage: node scripts/seedAdmin.js
 * 
 * Environment variables:
 *   SEED_ADMIN_EMAIL - Admin email (default: admin@nexar.com)
 *   SEED_ADMIN_PASSWORD - Admin password (default: admin123)
 */

import dotenv from 'dotenv';
dotenv.config();

import { AdminUser } from '../models/index.js';
import connectDB from '../config/db.js';

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@nexar.com';
    const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

    // Check if any admin exists
    const existingAdmin = await AdminUser.findOne({ email });

    if (existingAdmin) {
      console.log(`Admin user already exists: ${email}`);
      process.exit(0);
    }

    const admin = await AdminUser.create({
      email,
      password,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
    });

    console.log('✅ Super admin created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();
