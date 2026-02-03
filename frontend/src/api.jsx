import axios from 'axios';
import { getOrCreateDeviceId } from './utils/deviceFingerprint';

const api = axios.create({
  baseURL: import.meta.env.REACT_APP_API_URL,
});

// Flask ML service API client
const mlApi = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000, // 10 second timeout for image processing
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
 * Verify gender from camera-captured image
 * 
 * Privacy-first: Image is sent as base64, processed, and immediately discarded
 * Only the classification result is returned
 * 
 * @param {string} imageBase64 - Base64 encoded image from webcam
 * @returns {Promise<{success: boolean, gender?: string, confidence?: number, error?: string}>}
 */
export const verifyGender = async (imageBase64) => {
  try {
    // Include device ID in request for rate limiting
    const deviceId = await getOrCreateDeviceId();
    
    const response = await mlApi.post('/classify', {
      image: imageBase64,
    }, {
      headers: {
        'X-Device-ID': deviceId,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Gender verification error:', error);
    
    // Return error in consistent format
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to verify gender',
    };
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