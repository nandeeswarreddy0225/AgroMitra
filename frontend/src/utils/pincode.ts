import { lookupPincodeApi } from '../services/api';
import { PincodeLookupResponse } from '../types/location';

const clientCache = new Map<string, PincodeLookupResponse>();

/**
 * Fast client-side lookup for Indian 6-digit Pincode with caching
 */
export const lookupPincode = async (
  pincode: string
): Promise<{
  success: boolean;
  state?: string;
  district?: string;
  city?: string;
  postOfficeName?: string;
  message?: string;
}> => {
  const cleanPin = (pincode || '').toString().trim();

  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      success: false,
      message: 'Please enter a valid 6-digit Indian PIN code.',
    };
  }

  if (clientCache.has(cleanPin)) {
    const cached = clientCache.get(cleanPin)!;
    return {
      success: true,
      state: cached.state,
      district: cached.district,
      city: cached.city,
      postOfficeName: cached.postOfficeName,
    };
  }

  try {
    const res = await lookupPincodeApi(cleanPin);
    if (res.success) {
      clientCache.set(cleanPin, res);
      return {
        success: true,
        state: res.state,
        district: res.district,
        city: res.city,
        postOfficeName: res.postOfficeName,
      };
    }
    return {
      success: false,
      message: res.message || 'Pincode not found.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Unable to auto-fill location from pincode. Please enter manually.',
    };
  }
};
