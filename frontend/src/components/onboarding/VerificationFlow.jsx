import { useState } from 'react';
import PropTypes from 'prop-types';
import CameraVerification from './CameraVerification';

/**
 * Complete verification flow component
 * Handles the entire gender verification process + nickname collection
 */
const VerificationFlow = ({ onComplete, onSkip }) => {
  const [verificationResult, setVerificationResult] = useState(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerificationComplete = (result) => {
    console.log('Verification completed:', result);
    setVerificationResult(result);
  };

  const handleError = (err) => {
    console.error('Verification error:', err);
    setError(err.message || 'Verification failed');
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsSubmitting(true);
    
    // Call parent completion handler with both gender and nickname
    if (onComplete) {
      onComplete({
        ...verificationResult,
        nickname: nickname.trim(),
      });
    }
    
    setIsSubmitting(false);
  };

  if (verificationResult) {
    return (
      <div className="verification-flow">
        <div className="verification-flow__success">
          <h2>Verification Complete!</h2>
          <p>
            Gender: <strong>{verificationResult.gender}</strong>
            {verificationResult.confidence && (
              <span> (Confidence: {Math.round(verificationResult.confidence * 100)}%)</span>
            )}
          </p>
          
          <div className="verification-flow__nickname-section">
            <label htmlFor="nickname">Choose a nickname:</label>
            <input
              id="nickname"
              type="text"
              placeholder="Enter your nickname (max 32 characters)"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value.slice(0, 32));
                setError(null);
              }}
              maxLength={32}
              className="verification-flow__nickname-input"
            />
            {nickname.length > 0 && (
              <span className="verification-flow__char-count">
                {nickname.length}/32
              </span>
            )}
          </div>

          {error && (
            <div className="verification-flow__error-message">
              {error}
            </div>
          )}

          <div className="verification-flow__actions">
            <button
              onClick={handleNicknameSubmit}
              disabled={!nickname.trim() || isSubmitting}
              className="verification-flow__submit-btn"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
            <button
              onClick={() => {
                setVerificationResult(null);
                setNickname('');
                setError(null);
              }}
              className="verification-flow__retry-btn"
            >
              Verify Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-flow">
      <CameraVerification
        onVerificationComplete={handleVerificationComplete}
        onError={handleError}
      />
      {onSkip && (
        <div className="verification-flow__skip">
          <button onClick={onSkip} className="verification-flow__skip-btn">
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
};

export default VerificationFlow;

VerificationFlow.propTypes = {
  onComplete: PropTypes.func,
  onSkip: PropTypes.func,
};

