import rateLimit from 'express-rate-limit';
import Device from '../models/Device.js';

/**
 * In-memory store for rate limiting
 * Tracks request counts per device ID
 * In production, consider using Redis for distributed systems
 */
const requestCounts = new Map();

/**
 * Clean up old entries periodically to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.resetTime > oneHour) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Custom rate limit store that uses device ID
 * Tracks requests per device rather than per IP
 */
const deviceRateLimitStore = {
  /**
   * Increment request count for a device
   */
  increment: (key, cb) => {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return cb(null, { totalHits: 1, resetTime: new Date(now + windowMs) });
    }

    const record = requestCounts.get(key);
    
    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    return cb(null, {
      totalHits: record.count,
      resetTime: new Date(record.resetTime),
    });
  },

  /**
   * Decrement request count (not used but required by interface)
   */
  decrement: (key) => {
    if (requestCounts.has(key)) {
      const record = requestCounts.get(key);
      if (record.count > 0) {
        record.count -= 1;
      }
    }
  },

  /**
   * Reset request count for a device
   */
  resetKey: (key) => {
    requestCounts.delete(key);
  },

  /**
   * Shutdown (not used but required by interface)
   */
  shutdown: () => {
    requestCounts.clear();
  },
};

/**
 * General API rate limiter
 * Limits: 10 requests per minute per device
 * Applied to all API endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    limit: 10,
    window: '1 minute',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use device ID as the key instead of IP address
  keyGenerator: (req) => {
    return req.headers['x-device-id'] || req.ip || 'unknown';
  },
  // Custom store for device-based rate limiting
  store: deviceRateLimitStore,
  // Skip rate limiting for successful requests (optional)
  skip: (req) => {
    // You can add custom logic here to skip rate limiting for certain conditions
    return false;
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 * Limits: 5 requests per minute per device
 * Use for: verification, authentication, queue operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for this endpoint. Please try again later.',
    limit: 5,
    window: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-device-id'] || req.ip || 'unknown';
  },
  store: deviceRateLimitStore,
});

/**
 * Queue join rate limiter
 * Limits: 3 requests per minute per device
 * Prevents spam queue joins
 */
export const queueRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: {
    error: 'Too many queue join attempts',
    message: 'Please wait before joining the queue again.',
    limit: 3,
    window: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-device-id'] || req.ip || 'unknown';
  },
  store: deviceRateLimitStore,
});

/**
 * Middleware to check rate limits with device validation
 * Combines device validation with rate limiting
 */
export const deviceRateLimit = async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];

  if (!deviceId) {
    return res.status(400).json({
      error: 'Device ID is required',
      message: 'Please include X-Device-ID header in your request',
    });
  }

  // Apply rate limiting
  return apiRateLimiter(req, res, next);
};

