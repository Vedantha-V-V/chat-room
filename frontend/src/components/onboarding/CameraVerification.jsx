import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { verifyGender } from '../../api';
import './CameraVerification.css';

/**
 * Matrix-themed camera verification component
 * Camera-only capture with no file uploads
 */

/**
 * Camera-only verification component
 * 
 * Privacy-first design:
 * - Only allows camera capture (no file uploads)
 * - Blocks gallery/file input explicitly
 * - Images sent to API are never stored
 * - Only classification result is returned
 */
const CameraVerification = ({ onVerificationComplete, onError }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const webcamRef = useRef(null);

  /**
   * Handle camera user media (when camera access is granted)
   */
  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setError(null);
  }, []);

  /**
   * Handle camera errors (permission denied, no camera, etc.)
   */
  const handleUserMediaError = useCallback((err) => {
    console.error('Camera error:', err);
    setError('Camera access denied or not available. Please allow camera access to continue.');
    setCameraReady(false);
    if (onError) {
      onError(err);
    }
  }, [onError]);

  /**
   * Capture image from webcam and send for classification
   * Image is converted to base64 and sent immediately
   * Image is NOT stored locally or on server
   */
  const captureAndVerify = useCallback(async () => {
    if (!webcamRef.current) {
      setError('Camera not ready');
      return;
    }

    setIsCapturing(true);
    setIsProcessing(true);
    setError(null);

    try {
      // Capture image from webcam (base64 format)
      const imageSrc = webcamRef.current.getScreenshot({
        width: 640,
        height: 480,
        screenshotFormat: 'image/jpeg',
        screenshotQuality: 0.8,
      });

      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      // Send to Flask API for classification
      // Image is sent as base64, processed, and immediately discarded
      const result = await verifyGender(imageSrc);

      if (result.success && result.gender) {
        // Verification successful - pass result to parent
        if (onVerificationComplete) {
          onVerificationComplete({
            gender: result.gender,
            confidence: result.confidence,
          });
        }
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to verify gender';
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
    }
  }, [onVerificationComplete, onError]);

  return (
    <div className="camera-verification">
      <div className="camera-verification__header">
        <h2>Gender Verification</h2>
        <p className="camera-verification__subtitle">
          Please allow camera access to take a real-time selfie for verification.
          <br />
          <strong>Note:</strong> Gallery uploads are not allowed. Only live camera capture is permitted.
        </p>
      </div>

      <div className="camera-verification__camera-container">
        {!cameraReady && !error && (
          <div className="camera-verification__loading">
            <p>Requesting camera access...</p>
          </div>
        )}

        {error && (
          <div className="camera-verification__error">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setCameraReady(false);
              }}
              className="camera-verification__retry-btn"
            >
              Try Again
            </button>
          </div>
        )}

        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user', // Front-facing camera
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="camera-verification__webcam"
        />
      </div>

      <div className="camera-verification__controls">
        <button
          onClick={captureAndVerify}
          disabled={!cameraReady || isProcessing || isCapturing}
          className="camera-verification__capture-btn"
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : isCapturing ? (
            'Capturing...'
          ) : (
            'Capture & Verify'
          )}
        </button>
      </div>

      <div className="camera-verification__privacy-note">
        <p>
          🔒 <strong>Privacy First:</strong> Your image is processed in real-time and immediately deleted.
          Only the classification result (Male/Female) is stored. No images are saved.
        </p>
      </div>
    </div>
  );
};

export default CameraVerification;

