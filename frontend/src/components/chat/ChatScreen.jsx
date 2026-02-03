import { useState, useEffect, useRef } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import './ChatScreen.css';

/**
 * Chat Screen - 1-to-1 anonymous chat
 * Messages never hit DB - ephemeral only
 * Matrix-themed chat interface
 */
const ChatScreen = ({ matchId, onDisconnect }) => {
  const { deviceId } = useDeviceId();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // TODO: Initialize Socket.IO connection
    // For now, simulate connection
    setIsConnected(true);

    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'you',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');

    // TODO: Send via Socket.IO
    // socketRef.current.emit('message', { matchId, text: inputMessage });
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
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
            <div className="chat-match-id">MATCH_ID: {matchId}</div>
          </div>
          <button
            className="matrix-btn chat-disconnect-btn"
            onClick={handleDisconnect}
          >
            DISCONNECT
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
                className={`chat-message ${msg.sender === 'you' ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">{formatTime(msg.timestamp)}</div>
                </div>
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

