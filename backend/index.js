import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './db/connect.js';
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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health/root endpoint
app.get('/', async (req, res) => {
  res.send('Backend server is running');
});

// Apply general rate limiting to all API routes (10 req/min per device)
app.use('/api', apiRateLimiter);

/**
 * Queue join endpoint
 * - Validates device_id (from X-Device-ID header)
 * - Enforces ban status, daily limits, and cooldown
 * - Applies additional queue-specific rate limiting
 * 
 * NOTE: Matching pool is not implemented yet – this just simulates a join.
 */
app.post(
  '/api/queue/join',
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  checkDailyMatchLimit,
  checkQueueCooldown,
  queueRateLimiter,
  async (req, res) => {
    try {
      const filterPreference = req.body.filter_preference || 'any';

      // TODO: Add user to in-memory matching pool based on filterPreference + gender

      res.json({
        success: true,
        message: 'Joined queue successfully',
        filter_preference: filterPreference,
      });
    } catch (error) {
      console.error('Queue join error:', error);
      res.status(500).json({ error: 'Failed to join queue' });
    }
  },
  updateQueueJoinTime,
);

/**
 * Match creation endpoint
 * - Called when a match is made (e.g., from matching logic)
 * - Increments daily match count per filter type
 * 
 * For now this is a stub that just returns success.
 */
app.post(
  '/api/matches',
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  async (req, res) => {
    try {
      // TODO: Implement actual match creation logic (no DB storage for messages)
      res.json({
        success: true,
        message: 'Match created successfully',
      });
    } catch (error) {
      console.error('Match creation error:', error);
      res.status(500).json({ error: 'Failed to create match' });
    }
  },
  incrementMatchCount,
);

/**
 * Verification result endpoint
 * - Called by frontend AFTER Flask service classifies the selfie
 * - Stores only gender + verified_at on the device record
 * - Never stores the image itself
 */
app.post(
  '/api/verify-gender',
  validateDeviceId,
  getOrCreateDevice,
  checkBanStatus,
  async (req, res) => {
    try {
      const { gender, confidence } = req.body || {};

      if (!gender) {
        return res.status(400).json({
          success: false,
          error: 'Gender is required',
        });
      }

      // Persist ONLY minimal verification metadata on the device record
      req.device.gender = gender;
      req.device.verified_at = new Date();
      await req.device.save();

      res.json({
        success: true,
        gender,
        confidence,
      });
    } catch (error) {
      console.error('Verify gender error:', error);
      res.status(500).json({ error: 'Failed to save verification result' });
    }
  },
);

/**
 * Device usage stats endpoint
 * - Returns current daily match counts and ban status for this device
 */
app.get(
  '/api/device/stats',
  validateDeviceId,
  getOrCreateDevice,
  async (req, res) => {
    try {
      const device = req.device;
      device.resetDailyCountsIfNeeded();

      res.json({
        device_id: device.device_id,
        gender: device.gender,
        verified_at: device.verified_at,
        daily_matches: device.daily_matches,
        last_reset: device.last_reset,
        last_queue_join: device.last_queue_join,
        is_banned: device.is_banned,
      });
    } catch (error) {
      console.error('Device stats error:', error);
      res.status(500).json({ error: 'Failed to fetch device stats' });
    }
  },
);

const server = async () => {
  try {
    await connectDB(`${process.env.MONGODB_URI}`);
    console.log('MongoDB Connected');
  } catch (error) {
    console.log('DB Connection Failed', error);
  }

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`App is running at PORT:${PORT}`));
};

server();