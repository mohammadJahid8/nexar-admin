/**
 * Unit tests for authentication middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('../models/index.js', () => ({
  Business: {
    findByExternalIdWithApiKey: vi.fn(),
  },
}));

import { Business } from '../models/index.js';

// Import the middleware after mocking
import adminAuth from '../middleware/adminAuth.js';
import crmAuth from '../middleware/crmAuth.js';

describe('adminAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();

    // Set the env variable
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  it('should return 401 if X-Admin-Api-Key header is missing', () => {
    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing X-Admin-Api-Key header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if API key is invalid', () => {
    req.headers['x-admin-api-key'] = 'wrong-key';

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Invalid admin API key',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if API key is valid', () => {
    req.headers['x-admin-api-key'] = 'test-admin-key';

    adminAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 500 if ADMIN_API_KEY env is not set', () => {
    delete process.env.ADMIN_API_KEY;
    req.headers['x-admin-api-key'] = 'some-key';

    adminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server Configuration Error',
      message: 'Admin authentication is not properly configured',
    });
  });
});

describe('crmAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 if X-Business-Id header is missing', async () => {
    await crmAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing X-Business-Id header',
    });
  });

  it('should return 401 if X-Api-Key header is missing', async () => {
    req.headers['X-Business-Id'] = 'test-business';

    await crmAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing X-Api-Key header',
    });
  });

  it('should return 404 if business is not found', async () => {
    req.headers['X-Business-Id'] = 'unknown-business';
    req.headers['X-Api-Key'] = 'some-key';
    Business.findByExternalIdWithApiKey.mockResolvedValue(null);

    await crmAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not Found',
      message: 'Business not found',
    });
  });

  it('should return 403 if API key is invalid', async () => {
    req.headers['X-Business-Id'] = 'test-business';
    req.headers['X-Api-Key'] = 'wrong-key';
    Business.findByExternalIdWithApiKey.mockResolvedValue({
      apiKey: 'correct-key',
      toObject: () => ({ _id: '123', name: 'Test', apiKey: 'correct-key' }),
    });

    await crmAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
  });

  it('should call next and attach business if auth succeeds', async () => {
    req.headers['X-Business-Id'] = 'test-business';
    req.headers['X-Api-Key'] = 'correct-key';
    Business.findByExternalIdWithApiKey.mockResolvedValue({
      apiKey: 'correct-key',
      toObject: () => ({ _id: '123', name: 'Test', apiKey: 'correct-key' }),
    });

    await crmAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.business).toBeDefined();
    expect(req.business._id).toBe('123');
    expect(req.business.apiKey).toBeUndefined(); // apiKey should be removed
  });
});
