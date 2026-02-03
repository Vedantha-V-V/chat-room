import { useState, useEffect } from 'react';
import { getOrCreateDeviceId } from '../utils/deviceFingerprint';

/**
 * React hook for managing device ID
 * Automatically retrieves or creates device ID on mount
 * Provides device ID for use in components and API calls
 */
export const useDeviceId = () => {
  const [deviceId, setDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeDeviceId = async () => {
      try {
        setLoading(true);
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize device ID:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeDeviceId();
  }, []);

  return { deviceId, loading, error };
};

