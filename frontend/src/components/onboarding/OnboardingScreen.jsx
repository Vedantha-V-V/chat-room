import { useState, useEffect } from 'react';
import { useDeviceId } from '../../hooks/useDeviceId';
import { updateProfile } from '../../api';
import CameraVerification from './CameraVerification';
import './OnboardingScreen.css';

/**
 * Onboarding Screen - Step 1: Device ID Generation
 * Matrix-themed onboarding flow
 */
const OnboardingScreen = ({ onComplete }) => {
  const { deviceId, loading, error } = useDeviceId();
  const [step, setStep] = useState(1); // 1: Profile, 2: Verification, 3: Complete
  const [verificationResult, setVerificationResult] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

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
          nickname,
          bio,
        });
      }, 2000);
    }
  };

  const handleSaveProfileAndContinue = async () => {
    if (!nickname.trim()) {
      setProfileError('Please choose a nickname.');
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim(),
      });
      setStep(2);
    } catch (e) {
      setProfileError(
        e.response?.data?.error || e.message || 'Failed to save profile. Please try again.',
      );
    } finally {
      setSavingProfile(false);
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

            <div className="onboarding-profile-form">
              <label className="onboarding-label">
                NICKNAME (PSEUDONYM)
                <input
                  type="text"
                  className="matrix-input onboarding-input"
                  maxLength={32}
                  placeholder="e.g. NeonFox, CryptoOwl"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </label>

              <label className="onboarding-label mt-2">
                SHORT BIO (1–2 LINES)
                <textarea
                  className="matrix-input onboarding-textarea"
                  maxLength={140}
                  rows={2}
                  placeholder="e.g. Night owl, here for deep conversations."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>

              <p className="onboarding-hint">
                Use only pseudonyms. No real names, emails, socials, or contact info.
              </p>

              {profileError && (
                <div className="matrix-status-error mt-1" style={{ fontSize: '12px' }}>
                  {profileError}
                </div>
              )}

              <button
                className="matrix-btn matrix-btn-primary mt-2"
                onClick={handleSaveProfileAndContinue}
                disabled={savingProfile}
              >
                {savingProfile ? 'SAVING...' : 'SAVE & PROCEED TO VERIFICATION'}
              </button>
            </div>
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

