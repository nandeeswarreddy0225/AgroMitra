import { useState, useCallback } from 'react';
import { reverseGeocodeApi, validateCoordinatesApi } from '../services/api';
import { GPSLocationState } from '../types/location';
import { getAccurateDeviceLocation } from '../utils/geolocation';

export const usePrecisionLocation = () => {
  const [locationState, setLocationState] = useState<GPSLocationState>({
    isDetecting: false,
    isDenied: false,
    error: null,
  });

  const requestCurrentLocation = useCallback(async (): Promise<GPSLocationState> => {
    setLocationState((prev) => ({
      ...prev,
      isDetecting: true,
      error: null,
      isDenied: false,
    }));

    try {
      const position = await getAccurateDeviceLocation();
      const lat = position.latitude;
      const lon = position.longitude;
      const accuracy = position.accuracy;

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
          return state;
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
        return state;
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
        return state;
      }
    } catch (err: any) {
      const isDenied = (err.message || '').toLowerCase().includes('denied') || (err.message || '').toLowerCase().includes('permission');
      const state: GPSLocationState = {
        isDetecting: false,
        isDenied,
        error: err.message || 'Unable to retrieve location. Please enter your 6-digit PIN code.',
        source: 'MANUAL',
      };
      setLocationState(state);
      return state;
    }
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
