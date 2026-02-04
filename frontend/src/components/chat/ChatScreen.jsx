import { useState, useEffect, useRef } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import './ChatScreen.css';

/**
 * Chat Screen - 1-to-1 anonymous chat
 * Messages never hit DB - ephemeral only
 * Matrix-themed chat interface
 */
const ChatScreen = ({ matchId, roomName, socket, onDisconnect }) => {
  const { deviceId } = useDeviceId();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [userCount, setUserCount] = useState(1);
  const messagesEndRef = useRef(null);
  const nicknameRef = useRef('');

  useEffect(() => {
    // Get nickname from localStorage
    try {
      const saved = localStorage.getItem('anonymous_chat_user');
      if (saved) {
        const data = JSON.parse(saved);
        nicknameRef.current = data.nickname || 'Anonymous';
      }
    } catch (e) {
      nicknameRef.current = 'Anonymous';
    }
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log('No socket provided to ChatScreen');
      return;
    }

    console.log('ChatScreen socket connected:', socket.connected, 'id:', socket.id);
    setIsConnected(socket.connected);

    socket.on('connect', () => {
      console.log('Socket reconnected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new-message', (message) => {
      setMessages((prev) => [...prev, {
        ...message,
        sender: message.senderId === socket.id ? 'you' : message.sender,
      }]);
    });

    socket.on('user-joined', ({ nickname, userCount }) => {
      setUserCount(userCount);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `${nickname} joined the room`,
        sender: 'system',
        timestamp: new Date(),
      }]);
    });

    socket.on('user-left', ({ nickname, userCount }) => {
      setUserCount(userCount);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `${nickname} left the room`,
        sender: 'system',
        timestamp: new Date(),
      }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected || !socket) return;

    socket.emit('send-message', {
      roomId: matchId,
      message: inputMessage,
      nickname: nicknameRef.current,
    });

    setInputMessage('');
  };

  const handleDisconnect = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-screen">
      <div className="chat-container">
        {/* Chat Header */}
        <div className="chat-header matrix-border">
          <div className="chat-header-info">
            <div className="matrix-status-online">
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
            <div className="chat-match-id">ROOM: {roomName || matchId}</div>
            <div style={{ fontSize: '12px', color: 'var(--matrix-text-dim)' }}>
              Users in room: {userCount}
            </div>
          </div>
          <button
            className="matrix-btn chat-disconnect-btn"
            onClick={handleDisconnect}
          >
            LEAVE ROOM
          </button>
        </div>

        {/* Messages Area */}
        <div className="chat-messages matrix-terminal">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="matrix-typing">No messages yet...</div>
              <div style={{ marginTop: '16px', color: 'var(--matrix-text-dim)' }}>
                Start the conversation
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.sender === 'system' 
                    ? 'message-system' 
                    : msg.sender === 'you' 
                      ? 'message-sent' 
                      : 'message-received'
                }`}
              >
                {msg.sender === 'system' ? (
                  <div className="message-system-text">{msg.text}</div>
                ) : (
                  <div className="message-content">
                    {msg.sender !== 'you' && (
                      <div className="message-sender">{msg.sender}</div>
                    )}
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{formatTime(msg.timestamp)}</div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form className="chat-input-container matrix-border" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input matrix-input"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="matrix-btn chat-send-btn"
            disabled={!inputMessage.trim() || !isConnected}
          >
            SEND
          </button>
        </form>

        {/* Privacy Notice */}
        <div className="chat-privacy-notice">
          <div style={{ fontSize: '11px', color: 'var(--matrix-text-dim)' }}>
            &copy; {new Date().getFullYear()} Secure and private chat room
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;

