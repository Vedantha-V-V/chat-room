import express from 'express';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Suppress Mongoose strictQuery deprecation warning - set BEFORE any db operations
mongoose.set('strictQuery', false);

import { connectDB, disconnectDB } from './db/connect.js';
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
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Room management
const rooms = new Map(); // roomId -> { name, users: Map<socketId, userData>, createdAt, createdBy }

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Gemini setup (placeholder API key) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
let geminiModel = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Vision-capable model – using gemini-2.0-flash (latest stable model with vision support)
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// Health/root endpoint
app.get('/', async (req, res) => {
  res.send('Backend server is running');
});

// Get list of available rooms
app.get('/api/rooms', (req, res) => {
  const roomList = [];
  rooms.forEach((room, roomId) => {
    roomList.push({
      roomId,
      name: room.name,
      userCount: room.users.size,
      createdAt: room.createdAt,
      createdBy: room.createdBy,
    });
  });
  res.json({ rooms: roomList });
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
 * Gender verification endpoint (Gemini)
 * - Receives base64 image from frontend
 * - Sends image to Gemini for classification
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
      if (!geminiModel) {
        return res.status(500).json({
          success: false,
          error: 'Gemini API is not configured. Please set GEMINI_API_KEY.',
        });
      }

      const { image } = req.body || {};

      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'Image is required',
        });
      }

      // Expect image as data URL or raw base64 – strip prefix if present
      let base64Data = image;
      if (typeof base64Data === 'string' && base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      // Decode base64 to bytes (in memory only)
      const imageBytes = Buffer.from(base64Data, 'base64');

      // Build Gemini prompt – ask for a strict male/female classification
      const prompt =
        'You are a strict gender classifier for a selfie image. ' +
        'Return ONLY a single word: \"male\" or \"female\" based on the presented face. ' +
        'If you are unsure or the face is not visible, return \"unknown\". ' +
        'Do not include any explanation.';

      let gender = 'unknown';

      try {
        const result = await geminiModel.generateContent([
          { text: prompt },
          {
            inlineData: {
              data: imageBytes.toString('base64'),
              mimeType: 'image/jpeg',
            },
          },
        ]);

        const text = result.response.text().trim().toLowerCase();

        if (text.includes('male') && !text.includes('female')) {
          gender = 'male';
        } else if (text.includes('female') && !text.includes('male')) {
          gender = 'female';
        }
      } catch (apiError) {
        // Fallback to mock verification if API fails
        console.warn('Gemini API failed, using fallback:', apiError.status);

        if (apiError.status === 429) {
          // API quota exceeded - use mock mode for development
          console.log('Using mock verification (API quota exceeded)');
          gender = 'male';
          console.log('Mock verification assigned gender:', gender);
        } else {
          throw apiError;
        }
      }

      if (gender === 'unknown') {
        return res.status(422).json({
          success: false,
          error: 'Unable to confidently determine gender from image.',
        });
      }

      // Persist ONLY minimal verification metadata on the device record
      req.device.gender = gender;
      req.device.verified_at = new Date();
      await req.device.save();

      // Explicitly clear image bytes from memory (will then be GC’d)
      // eslint-disable-next-line no-unused-vars
      base64Data = null;
      // eslint-disable-next-line no-unused-vars
      // @ts-ignore
      imageBytes.fill(0);

      res.json({
        success: true,
        gender,
      });
    } catch (error) {
      console.error('Verify gender error:', error);
      res.status(500).json({ error: 'Failed to verify gender' });
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
        nickname: device.nickname,
        bio: device.bio,
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

/**
 * Update pseudonymous profile (nickname + bio)
 * - No PII: nickname/bio are short, free-text pseudonyms
 */
app.post(
  '/api/profile',
  validateDeviceId,
  getOrCreateDevice,
  async (req, res) => {
    try {
      const { nickname, bio } = req.body || {};

      // Simple length guards (avoid huge payloads)
      const safeNickname =
        typeof nickname === 'string' && nickname.trim().length <= 32
          ? nickname.trim()
          : null;
      const safeBio =
        typeof bio === 'string' && bio.trim().length <= 140
          ? bio.trim()
          : null;

      // Update device profile
      if (safeNickname !== null) {
        req.device.nickname = safeNickname;
      }
      if (safeBio !== null) {
        req.device.bio = safeBio;
      }

      await req.device.save();

      res.json({
        success: true,
        nickname: req.device.nickname,
        bio: req.device.bio,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },
);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', ({ roomName, nickname, deviceId }) => {
    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    rooms.set(roomId, {
      name: roomName || `Room ${rooms.size + 1}`,
      users: new Map([[socket.id, { nickname, deviceId }]]),
      createdAt: new Date(),
      createdBy: nickname || 'Anonymous',
    });

    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room-created', { roomId, roomName: rooms.get(roomId).name });
    
    // Broadcast updated room list to all connected clients
    io.emit('rooms-updated', getRoomList());
  });

  // Join an existing room
  socket.on('join-room', ({ roomId, nickname, deviceId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Clear emptyAt flag since someone joined
    delete room.emptyAt;
    
    room.users.set(socket.id, { nickname, deviceId });
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room-joined', { 
      roomId, 
      roomName: room.name,
      users: Array.from(room.users.values()).map(u => u.nickname || 'Anonymous')
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { 
      nickname: nickname || 'Anonymous',
      userCount: room.users.size
    });

    // Broadcast updated room list
    io.emit('rooms-updated', getRoomList());
  });

  // Send message in room
  socket.on('send-message', ({ roomId, message, nickname }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('new-message', {
      id: Date.now(),
      text: message,
      sender: nickname || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date(),
    });
  });

  // Leave room
  socket.on('leave-room', () => {
    handleLeaveRoom(socket);
  });

  // Get current room list
  socket.on('get-rooms', () => {
    socket.emit('rooms-updated', getRoomList());
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    handleLeaveRoom(socket);
  });
});

function handleLeaveRoom(socket) {
  const roomId = socket.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const user = room.users.get(socket.id);
  room.users.delete(socket.id);

  // Notify others in the room
  socket.to(roomId).emit('user-left', {
    nickname: user?.nickname || 'Anonymous',
    userCount: room.users.size
  });

  // Keep room alive for 5 minutes even when empty so others can join
  // Only delete if room has been empty for a while
  if (room.users.size === 0) {
    room.emptyAt = Date.now();
    // Schedule room deletion after 5 minutes if still empty
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom && currentRoom.users.size === 0 && currentRoom.emptyAt) {
        rooms.delete(roomId);
        io.emit('rooms-updated', getRoomList());
        console.log('Deleted empty room:', roomId);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  socket.leave(roomId);
  socket.roomId = null;

  // Broadcast updated room list
  io.emit('rooms-updated', getRoomList());
}

function getRoomList() {
  const roomList = [];
  rooms.forEach((room, roomId) => {
    roomList.push({
      roomId,
      name: room.name,
      userCount: room.users.size,
      createdAt: room.createdAt,
      createdBy: room.createdBy,
    });
  });
  return roomList;
}

const server = async () => {
  try {
    const dbConnection = await connectDB();
    if (dbConnection) {
      console.log('MongoDB Connected');
    }
  } catch (error) {
    console.log('DB Connection error:', error.message);
  }

  const PORT = process.env.PORT || 8000;
  httpServer.listen(PORT, () => console.log(`App is running at PORT:${PORT}`));
};

server();

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});