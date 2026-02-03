import axios from 'axios';
import { getOrCreateDeviceId } from './utils/deviceFingerprint';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const fetchData = async () => {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * Verify gender from camera-captured image using backend (Gemini)
 * 
 * Privacy-first: Image is sent as base64 to backend, forwarded to Gemini,
 * processed in memory only, and immediately discarded. Only the
 * classification result (gender) is stored on the device record.
 * 
 * @param {string} imageBase64 - Base64 encoded image from webcam
 * @returns {Promise<{success: boolean, gender?: string, error?: string}>}
 */
export const verifyGender = async (imageBase64) => {
  try {
    // Device ID header is already added by interceptor – we just call backend
    const response = await api.post('/api/verify-gender', {
      image: imageBase64,
    });

    return response.data;
  } catch (error) {
    console.error('Gender verification error:', error);

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to verify gender',
    };
  }
};

/**
 * Update pseudonymous profile (nickname + short bio)
 */
export const updateProfile = async ({ nickname, bio }) => {
  try {
    const response = await api.post('/api/profile', {
      nickname,
      bio,
    });
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Request interceptor to include device ID and token in all requests
api.interceptors.request.use(async (config) => {
  // Include device ID for device-based rate limiting and usage tracking
  try {
    const deviceId = await getOrCreateDeviceId();
    if (deviceId) {
      config.headers['X-Device-ID'] = deviceId;
    }
  } catch (error) {
    console.warn('Failed to get device ID for request:', error);
  }

  // Include auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default api;