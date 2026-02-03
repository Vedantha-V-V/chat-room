import Device from '../models/Device.js';

/**
 * Middleware to validate device ID presence
 * Ensures all requests include a device identifier for tracking
 */
export const validateDeviceId = (req, res, next) => {
  const deviceId = req.headers['x-device-id'] || req.body.device_id || req.query.device_id;

  if (!deviceId) {
    return res.status(400).json({
      error: 'Device ID is required',
      message: 'Please include X-Device-ID header in your request',
    });
  }

  req.deviceId = deviceId;
  next();
};

/**
 * Middleware to get or create device record
 * Loads device from database or creates new record if not found
 */
export const getOrCreateDevice = async (req, res, next) => {
  try {
    if (!req.deviceId) {
      return res.status(400).json({
        error: 'Device ID is required',
      });
    }

    let device = await Device.findOne({ device_id: req.deviceId });

    if (!device) {
      // Create new device record
      device = new Device({
        device_id: req.deviceId,
      });
      await device.save();
    }

    req.device = device;
    next();
  } catch (error) {
    console.error('Error getting/creating device:', error);
    return res.status(500).json({
      error: 'Failed to process device information',
    });
  }
};

/**
 * Middleware to check if device is banned
 * Blocks requests from banned devices
 */
export const checkBanStatus = async (req, res, next) => {
  try {
    if (!req.device) {
      return res.status(400).json({
        error: 'Device record not found',
      });
    }

    // Check if device is banned
    if (req.device.is_banned) {
      const now = new Date();
      
      // Check if ban has expired
      if (req.device.ban_until && now > req.device.ban_until) {
        // Unban device
        req.device.is_banned = false;
        req.device.ban_reason = null;
        req.device.ban_until = null;
        await req.device.save();
      } else {
        return res.status(403).json({
          error: 'Device is banned',
          message: req.device.ban_reason || 'This device has been banned',
          ban_until: req.device.ban_until,
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking ban status:', error);
    return res.status(500).json({
      error: 'Failed to check device status',
    });
  }
};

/**
 * Middleware to check daily match limits
 * Enforces 5 matches per day for specific gender filters
 * Usage: apply to queue join endpoints
 */
export const checkDailyMatchLimit = async (req, res, next) => {
  try {
    if (!req.device) {
      return res.status(400).json({
        error: 'Device record not found',
      });
    }

    // Get filter preference from request body or query
    const filterType = req.body.filter_preference || req.query.filter_preference || 'any';

    // Reset daily counts if needed
    req.device.resetDailyCountsIfNeeded();

    // Check if limit is reached (only for specific gender filters)
    if (filterType !== 'any' && req.device.hasReachedDailyLimit(filterType)) {
      return res.status(429).json({
        error: 'Daily match limit reached',
        message: `You have reached the daily limit of 5 matches for ${filterType} filter. Please try again tomorrow.`,
        limit: 5,
        filter_type: filterType,
        reset_time: new Date(req.device.last_reset.getTime() + 24 * 60 * 60 * 1000), // Next day
      });
    }

    next();
  } catch (error) {
    console.error('Error checking daily match limit:', error);
    return res.status(500).json({
      error: 'Failed to check match limits',
    });
  }
};

/**
 * Middleware to check queue join cooldown
 * Enforces 30 second cooldown between queue joins
 * Usage: apply to queue join endpoints
 */
export const checkQueueCooldown = async (req, res, next) => {
  try {
    if (!req.device) {
      return res.status(400).json({
        error: 'Device record not found',
      });
    }

    const cooldownSeconds = 30; // 30 seconds cooldown

    if (!req.device.canJoinQueue(cooldownSeconds)) {
      const now = new Date();
      const timeSinceLastJoin = (now - req.device.last_queue_join) / 1000;
      const remainingCooldown = cooldownSeconds - timeSinceLastJoin;

      return res.status(429).json({
        error: 'Cooldown period active',
        message: `Please wait ${Math.ceil(remainingCooldown)} seconds before joining the queue again`,
        cooldown_seconds: cooldownSeconds,
        remaining_seconds: Math.ceil(remainingCooldown),
      });
    }

    next();
  } catch (error) {
    console.error('Error checking queue cooldown:', error);
    return res.status(500).json({
      error: 'Failed to check cooldown status',
    });
  }
};

/**
 * Middleware to update queue join timestamp
 * Call this after successful queue join
 */
export const updateQueueJoinTime = async (req, res, next) => {
  try {
    if (req.device) {
      req.device.updateQueueJoinTime();
      await req.device.save();
    }
    next();
  } catch (error) {
    console.error('Error updating queue join time:', error);
    // Don't fail the request if this fails
    next();
  }
};

/**
 * Middleware to increment match count after successful match
 * Call this after a match is made
 */
export const incrementMatchCount = async (req, res, next) => {
  try {
    if (!req.device) {
      return next();
    }

    const filterType = req.body.filter_preference || req.query.filter_preference || 'any';
    req.device.incrementMatchCount(filterType);
    await req.device.save();
    
    next();
  } catch (error) {
    console.error('Error incrementing match count:', error);
    // Don't fail the request if this fails
    next();
  }
};

