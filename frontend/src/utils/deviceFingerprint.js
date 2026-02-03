import FingerprintJS from '@fingerprintjs/fingerprintjs';

const DEVICE_ID_KEY = 'device_id';
const DEVICE_ID_DB_NAME = 'chatRoomDB';
const DEVICE_ID_STORE_NAME = 'deviceStore';

/**
 * Initialize IndexedDB for device ID persistence
 * Provides fallback storage in addition to LocalStorage
 */
const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEVICE_ID_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DEVICE_ID_STORE_NAME)) {
        db.createObjectStore(DEVICE_ID_STORE_NAME);
      }
    };
  });
};

/**
 * Store device ID in IndexedDB
 */
const storeDeviceIdInDB = async (deviceId) => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([DEVICE_ID_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DEVICE_ID_STORE_NAME);
    store.put(deviceId, DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Failed to store device ID in IndexedDB:', error);
  }
};

/**
 * Get device ID from IndexedDB
 */
const getDeviceIdFromDB = async () => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([DEVICE_ID_STORE_NAME], 'readonly');
    const store = transaction.objectStore(DEVICE_ID_STORE_NAME);
    const request = store.get(DEVICE_ID_KEY);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to get device ID from IndexedDB:', error);
    return null;
  }
};

/**
 * Generate a unique device fingerprint using FingerprintJS
 * This creates a stable identifier based on browser/device characteristics
 * without collecting any personally identifiable information
 */
const generateDeviceFingerprint = async () => {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error);
    // Fallback: generate a random ID if fingerprinting fails
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * Get or create device ID
 * Priority: LocalStorage > IndexedDB > Generate new fingerprint
 * This ensures persistence across sessions while maintaining privacy
 */
export const getOrCreateDeviceId = async () => {
  // Try LocalStorage first (fastest)
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) {
    // Ensure it's also in IndexedDB as backup
    await storeDeviceIdInDB(deviceId);
    return deviceId;
  }

  // Try IndexedDB as fallback
  deviceId = await getDeviceIdFromDB();
  if (deviceId) {
    // Sync back to LocalStorage
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  // Generate new fingerprint if not found
  deviceId = await generateDeviceFingerprint();
  
  // Store in both locations for redundancy
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  await storeDeviceIdInDB(deviceId);

  return deviceId;
};

/**
 * Clear device ID (for testing or privacy reset)
 * Note: This should be used carefully as it will create a new identity
 */
export const clearDeviceId = async () => {
  localStorage.removeItem(DEVICE_ID_KEY);
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([DEVICE_ID_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(DEVICE_ID_STORE_NAME);
    store.delete(DEVICE_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear device ID from IndexedDB:', error);
  }
};

