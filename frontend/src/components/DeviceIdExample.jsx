/**
 * Example component demonstrating device ID usage
 * This shows how to use the useDeviceId hook in your React components
 */

import { useDeviceId } from '../hooks/useDeviceId';

const DeviceIdExample = () => {
  const { deviceId, loading, error } = useDeviceId();

  if (loading) {
    return <div>Loading device ID...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Device ID Example</h2>
      <p>Your device ID: {deviceId}</p>
      <p className="text-sm text-gray-500">
        This ID is automatically included in all API requests via the X-Device-ID header.
        It's stored locally and never tied to your personal identity.
      </p>
    </div>
  );
};

export default DeviceIdExample;

