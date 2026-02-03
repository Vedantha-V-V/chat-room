/**
 * Example usage of device fingerprinting and usage limit middleware
 * This file demonstrates how to integrate the middleware into your Express routes
 */

import express from 'express';
import { apiRateLimiter, queueRateLimiter } from './middleware/rateLimiter.js';
import {
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  checkDailyMatchLimit,
  checkQueueCooldown,
  updateQueueJoinTime,
  incrementMatchCount,
} from './middleware/usageLimits.js';

const app = express();

// Apply general rate limiting to all API routes (10 req/min per device)
app.use('/api', apiRateLimiter);

// Example: Queue join endpoint with full protection
app.post(
  '/api/queue/join',
  validateDeviceId,        // 1. Validate device ID is present
  getOrCreateDevice,       // 2. Load or create device record
  checkBanStatus,          // 3. Check if device is banned
  checkDailyMatchLimit,    // 4. Check daily match limits (5 per day for specific filters)
  checkQueueCooldown,      // 5. Check 30s cooldown between joins
  queueRateLimiter,        // 6. Additional rate limiting (3 req/min)
  async (req, res) => {
    // Your queue join logic here
    // req.device - Device model instance
    // req.deviceId - Device ID string
    // req.body.filter_preference - 'male', 'female', or 'any'
    
    try {
      // Add user to queue logic...
      const filterPreference = req.body.filter_preference || 'any';
      
      res.json({
        success: true,
        message: 'Joined queue successfully',
        filter_preference: filterPreference,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to join queue' });
    }
  },
  updateQueueJoinTime,     // 7. Update last queue join timestamp
);

// Example: Match creation endpoint
app.post(
  '/api/matches',
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  async (req, res) => {
    // Your match creation logic here
    
    try {
      // Create match logic...
      const filterPreference = req.body.filter_preference || 'any';
      
      res.json({
        success: true,
        message: 'Match created successfully',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create match' });
    }
  },
  incrementMatchCount,     // Increment match count after successful match
);

// Example: Gender verification endpoint (strict rate limiting)
app.post(
  '/api/verify-gender',
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  async (req, res) => {
    // Your gender verification logic here
    // Remember: Delete image immediately after classification!
    
    try {
      // Process image, classify, delete image...
      const gender = 'male'; // Example result
      
      res.json({
        success: true,
        gender: gender,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify gender' });
    }
  },
);

// Example: Get device usage stats
app.get(
  '/api/device/stats',
  validateDeviceId,
  getOrCreateDevice,
  async (req, res) => {
    // Return device usage information
    const device = req.device;
    device.resetDailyCountsIfNeeded();
    
    res.json({
      device_id: device.device_id,
      daily_matches: device.daily_matches,
      last_reset: device.last_reset,
      last_queue_join: device.last_queue_join,
      is_banned: device.is_banned,
    });
  },
);

export default app;

