/**
 * Unit tests for billing utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getNextFirstOfMonth,
  generateApiKey,
  formatCentsToAud,
  isValidRedirectUrl,
  mapSubscriptionStatus,
} from '../utils/billingUtils.js';

describe('getNextFirstOfMonth', () => {
  it('should return next month 1st for mid-month dates', () => {
    const date = new Date('2024-03-15T10:00:00Z');
    const result = getNextFirstOfMonth(date);
    const resultDate = new Date(result * 1000);

    expect(resultDate.getUTCFullYear()).toBe(2024);
    expect(resultDate.getUTCMonth()).toBe(3); // April (0-indexed)
    expect(resultDate.getUTCDate()).toBe(1);
    expect(resultDate.getUTCHours()).toBe(0);
    expect(resultDate.getUTCMinutes()).toBe(0);
    expect(resultDate.getUTCSeconds()).toBe(0);
  });

  it('should return next month 1st even on the 1st of current month', () => {
    const date = new Date('2024-03-01T00:00:00Z');
    const result = getNextFirstOfMonth(date);
    const resultDate = new Date(result * 1000);

    expect(resultDate.getUTCFullYear()).toBe(2024);
    expect(resultDate.getUTCMonth()).toBe(3); // April
    expect(resultDate.getUTCDate()).toBe(1);
  });

  it('should handle year rollover (December to January)', () => {
    const date = new Date('2024-12-15T10:00:00Z');
    const result = getNextFirstOfMonth(date);
    const resultDate = new Date(result * 1000);

    expect(resultDate.getUTCFullYear()).toBe(2025);
    expect(resultDate.getUTCMonth()).toBe(0); // January
    expect(resultDate.getUTCDate()).toBe(1);
  });

  it('should handle end of month dates', () => {
    const date = new Date('2024-01-31T23:59:59Z');
    const result = getNextFirstOfMonth(date);
    const resultDate = new Date(result * 1000);

    expect(resultDate.getUTCFullYear()).toBe(2024);
    expect(resultDate.getUTCMonth()).toBe(1); // February
    expect(resultDate.getUTCDate()).toBe(1);
  });

  it('should default to current date if no date provided', () => {
    const result = getNextFirstOfMonth();
    const resultDate = new Date(result * 1000);
    const now = new Date();

    // Should be next month from now
    let expectedMonth = now.getUTCMonth() + 1;
    let expectedYear = now.getUTCFullYear();
    if (expectedMonth > 11) {
      expectedMonth = 0;
      expectedYear += 1;
    }

    expect(resultDate.getUTCFullYear()).toBe(expectedYear);
    expect(resultDate.getUTCMonth()).toBe(expectedMonth);
    expect(resultDate.getUTCDate()).toBe(1);
  });
});

describe('generateApiKey', () => {
  it('should generate a key with default prefix', () => {
    const key = generateApiKey();
    expect(key).toMatch(/^nxr_live_[a-f0-9]{48}$/);
  });

  it('should generate a key with custom prefix', () => {
    const key = generateApiKey('test_');
    expect(key).toMatch(/^test_[a-f0-9]{48}$/);
  });

  it('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe('formatCentsToAud', () => {
  it('should format cents to AUD string', () => {
    expect(formatCentsToAud(5000)).toBe('50.00');
    expect(formatCentsToAud(2050)).toBe('20.50');
    expect(formatCentsToAud(100)).toBe('1.00');
    expect(formatCentsToAud(99)).toBe('0.99');
    expect(formatCentsToAud(0)).toBe('0.00');
  });
});

describe('isValidRedirectUrl', () => {
  it('should accept HTTPS URLs', () => {
    expect(isValidRedirectUrl('https://example.com/success')).toBe(true);
    expect(isValidRedirectUrl('https://app.mycrm.com/billing/callback')).toBe(true);
  });

  it('should accept HTTP in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    expect(isValidRedirectUrl('http://localhost:3000/success')).toBe(true);
    expect(isValidRedirectUrl('http://127.0.0.1:5173/callback')).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should reject invalid URLs', () => {
    expect(isValidRedirectUrl('not-a-url')).toBe(false);
    expect(isValidRedirectUrl('')).toBe(false);
    expect(isValidRedirectUrl('ftp://example.com')).toBe(false);
  });
});

describe('mapSubscriptionStatus', () => {
  it('should map Stripe statuses to billing statuses', () => {
    expect(mapSubscriptionStatus('active')).toBe('active');
    expect(mapSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapSubscriptionStatus('unpaid')).toBe('past_due');
    expect(mapSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapSubscriptionStatus('incomplete')).toBe('pending_checkout');
    expect(mapSubscriptionStatus('incomplete_expired')).toBe('canceled');
    expect(mapSubscriptionStatus('trialing')).toBe('active');
    expect(mapSubscriptionStatus('paused')).toBe('past_due');
  });

  it('should return not_enabled for unknown statuses', () => {
    expect(mapSubscriptionStatus('unknown')).toBe('not_enabled');
    expect(mapSubscriptionStatus('')).toBe('not_enabled');
  });
});
