import mongoose from 'mongoose';

/**
 * Device Schema for tracking usage limits and abuse prevention
 * Stores minimal metadata: device_id, usage counts, and timestamps
 * NO personally identifiable information is stored
 */
const DeviceSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // Pseudonymous profile (no real identity)
  nickname: {
    type: String,
    maxlength: 32,
    default: null,
  },
  bio: {
    type: String,
    maxlength: 140,
    default: null,
  },
  // Gender classification result (from verification)
  gender: {
    type: String,
    default: null,
    validate: {
      validator: function(value) {
        // Allow null for unverified devices, otherwise must be valid gender
        return value === null || ['male', 'female'].includes(value);
      },
      message: 'Gender must be either "male" or "female"',
    },
  },
  // When gender was verified
  verified_at: {
    type: Date,
    default: null,
  },
  // Daily match counts per filter type
  daily_matches: {
    male: { type: Number, default: 0 },
    female: { type: Number, default: 0 },
    any: { type: Number, default: 0 },
  },
  // Last reset date for daily limits
  last_reset: {
    type: Date,
    default: Date.now,
  },
  // Last queue join timestamp for cooldown enforcement
  last_queue_join: {
    type: Date,
    default: null,
  },
  // Ban status
  is_banned: {
    type: Boolean,
    default: false,
  },
  ban_reason: {
    type: String,
    default: null,
  },
  ban_until: {
    type: Date,
    default: null,
  },
  // Created timestamp
  created_at: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Reset daily match counts if it's a new day
 * Called before checking/incrementing match counts
 */
DeviceSchema.methods.resetDailyCountsIfNeeded = function () {
  const now = new Date();
  const lastReset = new Date(this.last_reset);
  
  // Check if it's a new day (compare dates, not times)
  const isNewDay = 
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getDate() !== lastReset.getDate();

  if (isNewDay) {
    this.daily_matches.male = 0;
    this.daily_matches.female = 0;
    this.daily_matches.any = 0;
    this.last_reset = now;
  }
};

/**
 * Check if device can join queue (cooldown check)
 * Returns true if cooldown period has passed
 */
DeviceSchema.methods.canJoinQueue = function (cooldownSeconds = 30) {
  if (!this.last_queue_join) {
    return true;
  }

  const now = new Date();
  const timeSinceLastJoin = (now - this.last_queue_join) / 1000; // seconds
  return timeSinceLastJoin >= cooldownSeconds;
};

/**
 * Check if device has reached daily match limit for a specific filter
 * Returns true if limit is reached
 */
DeviceSchema.methods.hasReachedDailyLimit = function (filterType) {
  this.resetDailyCountsIfNeeded();
  
  const limit = 5; // 5 matches per day for specific gender filters
  const count = this.daily_matches[filterType] || 0;
  return count >= limit;
};

/**
 * Increment match count for a filter type
 */
DeviceSchema.methods.incrementMatchCount = function (filterType) {
  this.resetDailyCountsIfNeeded();
  this.daily_matches[filterType] = (this.daily_matches[filterType] || 0) + 1;
};

/**
 * Update last queue join timestamp
 */
DeviceSchema.methods.updateQueueJoinTime = function () {
  this.last_queue_join = new Date();
};

const Device = mongoose.model('Device', DeviceSchema);

export default Device;

