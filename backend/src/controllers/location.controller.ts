import { Request, Response } from 'express';
import { LocationService } from '../services/location.service';

/**
 * Indian Pincode Auto-Fill & Lookup Controller
 * GET /api/location/pincode/:pincode or /api/location/pincode?pin=518001
 */
export const lookupPincodeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPin = req.params.pincode || req.query.pincode || req.query.pin;
    const pincode = String(rawPin || '').trim();

    if (!pincode) {
      res.status(400).json({
        success: false,
        message: 'Pincode parameter is required. Please provide a 6-digit Indian PIN.',
      });
      return;
    }

    const result = await LocationService.lookupPincode(pincode);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('[LocationController] Pincode lookup error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup pincode details due to a server error.',
      error: error.message,
    });
  }
};

/**
 * Coordinate Validation Controller
 * POST /api/location/validate
 */
export const validateCoordinatesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, lat, lon } = req.body;
    const targetLat = latitude !== undefined ? latitude : lat;
    const targetLon = longitude !== undefined ? longitude : lon;

    const validation = LocationService.validateCoordinates(targetLat, targetLon);

    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        ...validation,
      });
      return;
    }

    res.status(200).json({
      success: true,
      ...validation,
    });
  } catch (error: any) {
    console.error('[LocationController] Coordinate validation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coordinates.',
      error: error.message,
    });
  }
};

/**
 * Precision GPS Reverse Geocoding Controller
 * GET /api/location/reverse-geocode?lat=15.8281&lon=78.0373
 * POST /api/location/reverse-geocode { latitude: 15.8281, longitude: 78.0373 }
 */
export const reverseGeocodeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawLat = req.query.lat ?? req.query.latitude ?? req.body?.latitude ?? req.body?.lat;
    const rawLon = req.query.lon ?? req.query.lng ?? req.query.longitude ?? req.body?.longitude ?? req.body?.lon;

    if (rawLat === undefined || rawLon === undefined) {
      res.status(400).json({
        success: false,
        message: 'Both latitude (lat) and longitude (lon) query parameters or body fields are required.',
      });
      return;
    }

    const result = await LocationService.reverseGeocode(rawLat, rawLon);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('[LocationController] Reverse geocoding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse geocode coordinates.',
      error: error.message,
    });
  }
};
