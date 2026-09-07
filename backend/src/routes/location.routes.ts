import { Router } from 'express';
import {
  lookupPincodeController,
  validateCoordinatesController,
  reverseGeocodeController,
} from '../controllers/location.controller';

export const locationRouter = Router();

// ==========================================
// Pincode Lookup & Validation Endpoints
// ==========================================
locationRouter.get('/pincode/:pincode', lookupPincodeController);
locationRouter.get('/pincode', lookupPincodeController);

// ==========================================
// Coordinate Validation & Geo-Fencing
// ==========================================
locationRouter.post('/validate', validateCoordinatesController);
locationRouter.get('/validate', validateCoordinatesController);

// ==========================================
// Precision GPS Reverse Geocoding Endpoints
// ==========================================
locationRouter.get('/reverse-geocode', reverseGeocodeController);
locationRouter.post('/reverse-geocode', reverseGeocodeController);

export default locationRouter;
