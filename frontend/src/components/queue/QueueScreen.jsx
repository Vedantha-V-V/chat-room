import { useState, useEffect } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import './QueueScreen.css';

/**
 * Queue Screen - Join queue with gender filter
 * Matrix-themed queue interface
 */
const QueueScreen = ({ onMatchFound, userGender }) => {
  const { deviceId } = useDeviceId();
  const [filter, setFilter] = useState('any');
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [error, setError] = useState(null);
  const [dailyMatches, setDailyMatches] = useState({ male: 0, female: 0, any: 0 });

  useEffect(() => {
    let interval;
    if (isInQueue) {
      interval = setInterval(() => {
        setQueueTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInQueue]);

  const handleJoinQueue = async () => {
    if (!deviceId) {
      setError('Device ID not available');
      return;
    }

    try {
      setError(null);
      setIsInQueue(true);
      setQueueTime(0);

      // TODO: Connect to Socket.IO and join queue
      // For now, simulate matching after 3 seconds
      setTimeout(() => {
        // Simulate match found
        if (onMatchFound) {
          onMatchFound({
            matchId: 'match_' + Date.now(),
            matchedAt: new Date(),
          });
        }
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to join queue');
      setIsInQueue(false);
    }
  };

  const handleLeaveQueue = () => {
    setIsInQueue(false);
    setQueueTime(0);
    // TODO: Leave queue via Socket.IO
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="queue-screen">
      <div className="matrix-card queue-card">
        <h1>FIND MATCH</h1>
        
        <div className="matrix-terminal mt-3">
          <div>DEVICE_ID: {deviceId}</div>
          <div className="mt-1">GENDER: <span className="matrix-glow-subtle">{userGender?.toUpperCase() || 'UNKNOWN'}</span></div>
          {/* <div className="mt-2">
            DAILY_MATCHES:
            <div className="mt-1" style={{ paddingLeft: '16px', color: 'var(--matrix-text-dim)' }}>
              MALE: {dailyMatches.male}/5
              <br />
              FEMALE: {dailyMatches.female}/5
              <br />
              ANY: {dailyMatches.any}/∞
            </div>
          </div>*/}
        </div>

        {!isInQueue ? (
          <div className="queue-controls mt-4">
            <div className="filter-selector">
              <label className="filter-label">SELECT FILTER:</label>
              <div className="filter-options">
                <button
                  className={`filter-btn ${filter === 'male' ? 'active' : ''}`}
                  onClick={() => setFilter('male')}
                  disabled={dailyMatches.male >= 5}
                >
                  MALE
                  {dailyMatches.male >= 5 && <span className="limit-reached"> (LIMIT)</span>}
                </button>
                <button
                  className={`filter-btn ${filter === 'female' ? 'active' : ''}`}
                  onClick={() => setFilter('female')}
                  disabled={dailyMatches.female >= 5}
                >
                  FEMALE
                  {dailyMatches.female >= 5 && <span className="limit-reached"> (LIMIT)</span>}
                </button>
                <button
                  className={`filter-btn ${filter === 'any' ? 'active' : ''}`}
                  onClick={() => setFilter('any')}
                >
                  ANY
                </button>
              </div>
            </div>

            {error && (
              <div className="matrix-status-error mt-2">{error}</div>
            )}

            <button
              className="matrix-btn matrix-btn-primary mt-3"
              onClick={handleJoinQueue}
              disabled={!filter}
            >
              JOIN QUEUE
            </button>
          </div>
        ) : (
          <div className="queue-waiting mt-4">
            <div className="matrix-terminal">
              <div className="matrix-status-online">SEARCHING FOR MATCH...</div>
              <div className="mt-2">
                FILTER: <span className="matrix-glow-subtle">{filter.toUpperCase()}</span>
              </div>
              <div className="mt-2">
                TIME: <span className="matrix-glow-subtle">{formatTime(queueTime)}</span>
              </div>
              <div className="mt-3 matrix-pulse">
                <div className="matrix-typing">Scanning network...</div>
              </div>
            </div>
            <button
              className="matrix-btn mt-3"
              onClick={handleLeaveQueue}
            >
              LEAVE QUEUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueScreen;

