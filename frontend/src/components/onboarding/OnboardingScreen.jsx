import { useState, useEffect } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import CameraVerification from './CameraVerification';
import './OnboardingScreen.css';

/**
 * Onboarding Screen - Step 1: Device ID Generation
 * Matrix-themed onboarding flow
 */
const OnboardingScreen = ({ onComplete }) => {
  const { deviceId, loading, error } = useDeviceId();
  const [step, setStep] = useState(1); // 1: Device ID, 2: Verification, 3: Complete
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerificationComplete = (result) => {
    setVerificationResult(result);
    setStep(3);
    
    // Save verification result and proceed
    if (onComplete) {
      setTimeout(() => {
        onComplete({
          deviceId,
          gender: result.gender,
          confidence: result.confidence,
        });
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-screen">
        <div className="matrix-card onboarding-card">
          <div className="matrix-terminal">
            <div className="matrix-typing">INITIALIZING SYSTEM...</div>
            <div className="matrix-spinner" style={{ margin: '20px auto' }}></div>
            <div style={{ marginTop: '16px', color: 'var(--matrix-text-dim)' }}>
              Generating device fingerprint...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-screen">
        <div className="matrix-card onboarding-card">
          <div className="matrix-terminal">
            <div className="matrix-status-error">ERROR: {error}</div>
            <button className="matrix-btn mt-2" onClick={() => window.location.reload()}>
              RETRY
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onboarding-screen">
        <div className="matrix-card onboarding-card">
          <h1>ANONYMOUS CHAT</h1>
          <div className="matrix-terminal mt-3">
            <div>SYSTEM READY</div>
            <div className="mt-2">DEVICE_ID: {deviceId}</div>
            <div className="mt-2" style={{ color: 'var(--matrix-text-dim)' }}>
              Status: <span className="matrix-status-online">ACTIVE</span>
            </div>
          </div>
          <div className="mt-4">
            <p style={{ marginBottom: '16px', color: 'var(--matrix-text-dim)' }}>
              Privacy-first anonymous chat platform.
              <br />
              No personal data collected. Ephemeral conversations.
            </p>
            <button
              className="matrix-btn matrix-btn-primary"
              onClick={() => setStep(2)}
            >
              PROCEED TO VERIFICATION
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onboarding-screen">
        <div className="matrix-card onboarding-card">
          <h2 className="matrix-glow-subtle">GENDER VERIFICATION</h2>
          <CameraVerification
            onVerificationComplete={handleVerificationComplete}
            onError={(err) => {
              console.error('Verification error:', err);
            }}
          />
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="onboarding-screen">
        <div className="matrix-card onboarding-card">
          <div className="matrix-terminal">
            <div className="matrix-status-online">VERIFICATION COMPLETE</div>
            <div className="mt-2">
              GENDER: <span className="matrix-glow">{verificationResult?.gender?.toUpperCase()}</span>
            </div>
            {verificationResult?.confidence && (
              <div className="mt-1" style={{ color: 'var(--matrix-text-dim)' }}>
                CONFIDENCE: {Math.round(verificationResult.confidence * 100)}%
              </div>
            )}
            <div className="mt-3 matrix-typing">Initializing chat system...</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default OnboardingScreen;

