import { useState, useCallback } from 'react';
import { reverseGeocodeApi, validateCoordinatesApi } from '../services/api';
import { GPSLocationState } from '../types/location';

export const usePrecisionLocation = () => {
  const [locationState, setLocationState] = useState<GPSLocationState>({
    isDetecting: false,
    isDenied: false,
    error: null,
  });

  const requestCurrentLocation = useCallback(async (): Promise<GPSLocationState> => {
    if (!navigator.geolocation) {
      const state: GPSLocationState = {
        isDetecting: false,
        isDenied: false,
        error: 'GPS Geolocation is not supported by your browser/device. Please enter your 6-digit pincode.',
        source: 'MANUAL',
      };
      setLocationState(state);
      return state;
    }

    setLocationState((prev) => ({
      ...prev,
      isDetecting: true,
      error: null,
      isDenied: false,
    }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          try {
            // Validate coordinates with backend
            const val = await validateCoordinatesApi({ latitude: lat, longitude: lon });
            if (!val.isValid) {
              const state: GPSLocationState = {
                latitude: lat,
                longitude: lon,
                accuracy,
                isDetecting: false,
                isDenied: false,
                error: 'GPS returned invalid geographical coordinates. Please enter your location manually.',
                source: 'GPS',
              };
              setLocationState(state);
              resolve(state);
              return;
            }

            // Reverse geocode with privacy preservation
            const geoRes = await reverseGeocodeApi({ lat, lon });
            const state: GPSLocationState = {
              latitude: lat,
              longitude: lon,
              accuracy,
              city: geoRes.city,
              district: geoRes.district,
              state: geoRes.state,
              formattedAddress: geoRes.formattedAddress,
              isDetecting: false,
              isDenied: false,
              error: null,
              source: 'GPS',
              timestamp: Date.now(),
            };

            setLocationState(state);
            resolve(state);
          } catch {
            // If backend reverse geocode is slow or offline, still preserve valid GPS coordinates
            const state: GPSLocationState = {
              latitude: lat,
              longitude: lon,
              accuracy,
              city: `GPS (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
              formattedAddress: `GPS (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
              isDetecting: false,
              isDenied: false,
              error: null,
              source: 'GPS',
              timestamp: Date.now(),
            };
            setLocationState(state);
            resolve(state);
          }
        },
        (err) => {
          let errorMsg = 'Unable to determine GPS location.';
          let isDenied = false;

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = 'Location permission was denied. You can enter your 6-digit PIN code below.';
              isDenied = true;
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = 'GPS location signal is currently unavailable. Please enter your PIN code.';
              break;
            case err.TIMEOUT:
              errorMsg = 'Location request timed out. Please try again or enter your PIN code.';
              break;
            default:
              errorMsg = err.message || errorMsg;
              break;
          }

          const state: GPSLocationState = {
            isDetecting: false,
            isDenied,
            error: errorMsg,
            source: 'MANUAL',
          };
          setLocationState(state);
          resolve(state);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1 minute max cached age, no continuous tracking
        }
      );
    });
  }, []);

  const clearLocationError = useCallback(() => {
    setLocationState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    locationState,
    requestCurrentLocation,
    clearLocationError,
  };
};

export default usePrecisionLocation;
