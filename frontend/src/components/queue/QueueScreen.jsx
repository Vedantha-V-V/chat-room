import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useDeviceId } from '../../hooks/useDeviceId';
import './QueueScreen.css';

const SOCKET_URL = 'http://localhost:8000';

/**
 * Queue Screen - Create or join chat rooms
 * Matrix-themed room selection interface
 */
const QueueScreen = ({ onMatchFound, userGender, userNickname, userBio }) => {
  const { deviceId } = useDeviceId();
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const navigatingToChat = useRef(false);

  // Fetch rooms via HTTP API (more reliable for initial load)
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/rooms`);
      const data = await response.json();
      setRooms(data.rooms || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch rooms via HTTP first
    fetchRooms();

    // Connect to socket
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to server, socket id:', socketRef.current.id);
      setIsConnected(true);
      // Also request rooms via socket
      socketRef.current.emit('get-rooms');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('rooms-updated', (roomList) => {
      console.log('Received rooms-updated:', roomList);
      setRooms(roomList);
      setIsLoading(false);
    });

    socketRef.current.on('room-created', ({ roomId, roomName }) => {
      if (onMatchFound) {
        navigatingToChat.current = true;
        onMatchFound({
          matchId: roomId,
          roomName,
          socket: socketRef.current,
          matchedAt: new Date(),
        });
      }
    });

    socketRef.current.on('room-joined', ({ roomId, roomName }) => {
      if (onMatchFound) {
        navigatingToChat.current = true;
        onMatchFound({
          matchId: roomId,
          roomName,
          socket: socketRef.current,
          matchedAt: new Date(),
        });
      }
    });

    socketRef.current.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      // Only disconnect if we're not navigating to chat (socket will be reused)
      if (socketRef.current && !navigatingToChat.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onMatchFound, fetchRooms]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchRooms();
    if (socketRef.current?.connected) {
      socketRef.current.emit('get-rooms');
    }
  };

  const handleCreateRoom = () => {
    if (!deviceId) {
      setError('Device ID not available');
      return;
    }

    if (!socketRef.current?.connected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setError(null);
    socketRef.current.emit('create-room', {
      roomName: newRoomName || `${userNickname || 'Anonymous'}'s Room`,
      nickname: userNickname,
      deviceId,
    });
  };

  const handleJoinRoom = (roomId) => {
    if (!deviceId) {
      setError('Device ID not available');
      return;
    }

    if (!socketRef.current?.connected) {
      setError('Not connected to server. Please wait...');
      return;
    }

    setError(null);
    socketRef.current.emit('join-room', {
      roomId,
      nickname: userNickname,
      deviceId,
    });
  };

  return (
    <div className="queue-screen">
      <div className="matrix-card queue-card">
        <h1>CHAT ROOMS</h1>
        
        <div className="matrix-terminal mt-3">
          <div>DEVICE_ID: {deviceId}</div>
          <div className="mt-1">
            NICKNAME:{' '}
            <span className="matrix-glow-subtle">
              {userNickname || 'ANON'}
            </span>
          </div>
          <div className="mt-1">
            GENDER:{' '}
            <span className="matrix-glow-subtle">
              {userGender?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          {userBio && (
            <div className="mt-1" style={{ color: 'var(--matrix-text-dim)', fontSize: '12px' }}>
              BIO: {userBio}
            </div>
          )}
        </div>

        {error && (
          <div className="matrix-status-error mt-2">{error}</div>
        )}

        {/* Create Room Section */}
        <div className="create-room-section mt-4">
          <h3 style={{ color: 'var(--matrix-green)', marginBottom: '12px' }}>CREATE NEW ROOM</h3>
          <div className="create-room-form">
            <input
              type="text"
              className="matrix-input"
              placeholder="Room name (optional)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              style={{ marginRight: '10px', flex: 1 }}
            />
            <button
              className="matrix-btn matrix-btn-primary"
              onClick={handleCreateRoom}
            >
              CREATE
            </button>
          </div>
        </div>

        {/* Available Rooms Section */}
        <div className="rooms-section mt-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--matrix-green)', margin: 0 }}>
              AVAILABLE ROOMS ({rooms.length})
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '12px', 
                color: isConnected ? 'var(--matrix-green)' : 'var(--matrix-error)',
                fontFamily: 'var(--font-mono)'
              }}>
                {isConnected ? '● CONNECTED' : '○ DISCONNECTED'}
              </span>
              <button
                className="matrix-btn"
                onClick={handleRefresh}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                REFRESH
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="matrix-terminal">
              <div className="matrix-typing">Loading rooms...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="matrix-terminal">
              <div style={{ color: 'var(--matrix-text-dim)' }}>
                No rooms available. Create one to start chatting!
              </div>
            </div>
          ) : (
            <div className="rooms-list">
              {rooms.map((room) => (
                <div key={room.roomId} className="room-item matrix-terminal">
                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-meta">
                      <span className="matrix-status-online">
                        {room.userCount} user{room.userCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ color: 'var(--matrix-text-dim)', marginLeft: '10px' }}>
                        Created by {room.createdBy}
                      </span>
                    </div>
                  </div>
                  <button
                    className="matrix-btn"
                    onClick={() => handleJoinRoom(room.roomId)}
                  >
                    JOIN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueScreen;

