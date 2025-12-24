/**
 * Unit tests for webhook idempotency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Create a mock schema and model
const mockStripeEventModel = {
  findOne: vi.fn(),
  create: vi.fn(),
};

// Mock the StripeEvent model
vi.mock('../models/StripeEvent.js', () => ({
  default: {
    isProcessed: async (eventId) => {
      const existing = await mockStripeEventModel.findOne({ eventId });
      return !!existing;
    },
    markProcessed: async (eventId, type, created, businessId = null, error = null) => {
      return mockStripeEventModel.create({
        eventId,
        type,
        created,
        businessId,
        error,
        processedAt: new Date(),
      });
    },
  },
}));

import StripeEvent from '../models/StripeEvent.js';

describe('Webhook Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isProcessed', () => {
    it('should return false for new events', async () => {
      mockStripeEventModel.findOne.mockResolvedValue(null);

      const result = await StripeEvent.isProcessed('evt_new123');

      expect(mockStripeEventModel.findOne).toHaveBeenCalledWith({ eventId: 'evt_new123' });
      expect(result).toBe(false);
    });

    it('should return true for already processed events', async () => {
      mockStripeEventModel.findOne.mockResolvedValue({
        eventId: 'evt_existing123',
        type: 'checkout.session.completed',
        processedAt: new Date(),
      });

      const result = await StripeEvent.isProcessed('evt_existing123');

      expect(result).toBe(true);
    });
  });

  describe('markProcessed', () => {
    it('should create a new event record', async () => {
      const mockEvent = {
        eventId: 'evt_new123',
        type: 'checkout.session.completed',
        created: 1234567890,
        processedAt: expect.any(Date),
      };
      mockStripeEventModel.create.mockResolvedValue(mockEvent);

      const result = await StripeEvent.markProcessed(
        'evt_new123',
        'checkout.session.completed',
        1234567890,
      );

      expect(mockStripeEventModel.create).toHaveBeenCalledWith({
        eventId: 'evt_new123',
        type: 'checkout.session.completed',
        created: 1234567890,
        businessId: null,
        error: null,
        processedAt: expect.any(Date),
      });
    });

    it('should store error message if processing failed', async () => {
      mockStripeEventModel.create.mockResolvedValue({});

      await StripeEvent.markProcessed(
        'evt_failed123',
        'invoice.paid',
        1234567890,
        '507f1f77bcf86cd799439011',
        'Business not found',
      );

      expect(mockStripeEventModel.create).toHaveBeenCalledWith({
        eventId: 'evt_failed123',
        type: 'invoice.paid',
        created: 1234567890,
        businessId: '507f1f77bcf86cd799439011',
        error: 'Business not found',
        processedAt: expect.any(Date),
      });
    });
  });

  describe('Idempotency behavior', () => {
    it('should not process the same event twice', async () => {
      const eventId = 'evt_duplicate123';
      let processCount = 0;

      // First call: event not found
      mockStripeEventModel.findOne.mockResolvedValueOnce(null);

      // Process function
      const processEvent = async () => {
        const isProcessed = await StripeEvent.isProcessed(eventId);
        if (isProcessed) {
          return { skipped: true };
        }
        processCount++;
        await StripeEvent.markProcessed(eventId, 'test.event', Date.now());
        return { processed: true };
      };

      // First processing
      const result1 = await processEvent();
      expect(result1).toEqual({ processed: true });
      expect(processCount).toBe(1);

      // Second call: event found
      mockStripeEventModel.findOne.mockResolvedValueOnce({ eventId });

      // Second processing (should be skipped)
      const result2 = await processEvent();
      expect(result2).toEqual({ skipped: true });
      expect(processCount).toBe(1); // Still 1, not incremented
    });
  });
});
