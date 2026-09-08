export interface DeviceLocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Robust device location resolver with high-accuracy GPS and user-friendly error messages.
 * In Android Native App, MainActivity requests runtime ACCESS_FINE_LOCATION and configures
 * WebChromeClient.onGeolocationPermissionsShowPrompt so navigator.geolocation receives direct hardware GPS.
 */
export async function getAccurateDeviceLocation(): Promise<DeviceLocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your device. Please enter a 6-digit PIN code.'));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = 'Unable to retrieve location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in device Settings or enter your 6-digit PIN code.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable. Please check that device GPS is enabled or enter your 6-digit PIN code.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please try again or enter your 6-digit PIN code.';
            break;
          default:
            msg = err.message || msg;
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}
