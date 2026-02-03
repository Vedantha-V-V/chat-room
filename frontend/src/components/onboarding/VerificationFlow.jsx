import { useState } from 'react';
import CameraVerification from './CameraVerification';

/**
 * Complete verification flow component
 * Handles the entire gender verification process
 */
const VerificationFlow = ({ onComplete, onSkip }) => {
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerificationComplete = (result) => {
    console.log('Verification completed:', result);
    setVerificationResult(result);
    
    // Pass result to parent component
    if (onComplete) {
      onComplete(result);
    }
  };

  const handleError = (err) => {
    console.error('Verification error:', err);
    setError(err.message || 'Verification failed');
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
          <button
            onClick={() => {
              setVerificationResult(null);
              setError(null);
            }}
            className="verification-flow__retry-btn"
          >
            Verify Again
          </button>
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

