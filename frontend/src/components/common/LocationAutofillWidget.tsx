import React, { useState } from 'react';
import {
  Compass,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building,
  Shield,
} from 'lucide-react';
import { lookupPincode } from '../../utils/pincode';
import { usePrecisionLocation } from '../../hooks/usePrecisionLocation';

interface LocationAutofillWidgetProps {
  street: string;
  setStreet: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  pincode: string;
  setPincode: (val: string) => void;
  latitude?: number;
  setLatitude?: (val: number | undefined) => void;
  longitude?: number;
  setLongitude?: (val: number | undefined) => void;
  unlockedFields?: Record<string, boolean>;
  unlockField?: (key: string) => void;
  showCoordinates?: boolean;
  className?: string;
}

export const LocationAutofillWidget: React.FC<LocationAutofillWidgetProps> = ({
  street,
  setStreet,
  city,
  setCity,
  state,
  setState,
  pincode,
  setPincode,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  unlockedFields = {},
  unlockField = () => {},
  showCoordinates = false,
  className = '',
}) => {
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [pincodeSuccessMsg, setPincodeSuccessMsg] = useState<string | null>(null);
  const [pincodeErrorMsg, setPincodeErrorMsg] = useState<string | null>(null);

  const { locationState, requestCurrentLocation, clearLocationError } = usePrecisionLocation();

  const handlePincodeChange = async (pinValue: string) => {
    setPincode(pinValue);
    setPincodeSuccessMsg(null);
    setPincodeErrorMsg(null);

    const clean = pinValue.trim();
    if (clean.length === 6) {
      setIsPincodeLoading(true);
      const res = await lookupPincode(clean);
      setIsPincodeLoading(false);

      if (res.success) {
        if (res.state) {
          setState(res.state);
          unlockField('state');
        }
        if (res.district || res.city) {
          setCity(res.district || res.city || '');
          unlockField('city');
        }
        if (res.postOfficeName && !street) {
          setStreet(res.postOfficeName);
          unlockField('street');
        }
        setPincodeSuccessMsg(`Resolved: ${res.district || res.city}, ${res.state}`);
      } else {
        setPincodeErrorMsg(res.message || 'Unable to resolve pincode automatically. Please enter details manually.');
      }
    }
  };

  const handleGpsClick = async () => {
    setPincodeErrorMsg(null);
    clearLocationError();
    const result = await requestCurrentLocation();

    if (result.latitude !== undefined && result.longitude !== undefined) {
      if (setLatitude) setLatitude(result.latitude);
      if (setLongitude) setLongitude(result.longitude);

      if (result.state) {
        setState(result.state);
        unlockField('state');
      }
      if (result.city || result.district) {
        setCity(result.city || result.district || '');
        unlockField('city');
      }
      if (result.formattedAddress && !street) {
        setStreet(result.formattedAddress);
        unlockField('street');
      }
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header with GPS Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Address & Location Intelligence
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Enter 6-digit PIN code for auto-fill or use precision device GPS
          </span>
        </div>

        <button
          type="button"
          onClick={handleGpsClick}
          disabled={locationState.isDetecting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          {locationState.isDetecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{locationState.isDetecting ? 'Detecting GPS...' : 'Use My Current Location'}</span>
        </button>
      </div>

      {/* GPS Status / Privacy Notice */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
        <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Privacy protected: Location is accessed on-demand only for mandi rates and field weather.</span>
      </div>

      {/* Error Banners */}
      {(locationState.error || pincodeErrorMsg) && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{locationState.error || pincodeErrorMsg}</span>
        </div>
      )}

      {/* Success Banner */}
      {pincodeSuccessMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{pincodeSuccessMsg}</span>
        </div>
      )}

      {/* Street / Landmark input */}
      <div>
        <label htmlFor="widget_street" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Street / Market Gate / Landmark
        </label>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Building className="h-4 w-4" />
          </div>
          <input
            id="widget_street"
            name="widget_street"
            type="text"
            autoComplete="off"
            readOnly={!unlockedFields['street']}
            onFocus={() => unlockField('street')}
            onPointerDown={() => unlockField('street')}
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="e.g. Near APMC Yard Gate 2 / Main Road"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 3-Col: PIN Code, City/District, State */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Pincode with Auto-fill */}
        <div>
          <label htmlFor="widget_pincode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            PIN Code <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="widget_pincode"
              name="widget_pincode"
              type="text"
              maxLength={6}
              autoComplete="off"
              readOnly={!unlockedFields['pincode']}
              onFocus={() => unlockField('pincode')}
              onPointerDown={() => unlockField('pincode')}
              value={pincode}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="6-digit PIN (e.g. 518001)"
              className="block w-full px-3 py-2 pr-8 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {isPincodeLoading && (
              <div className="absolute right-2.5 top-2.5 text-emerald-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* City / District */}
        <div>
          <label htmlFor="widget_city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            District / City <span className="text-rose-500">*</span>
          </label>
          <input
            id="widget_city"
            name="widget_city"
            type="text"
            autoComplete="off"
            readOnly={!unlockedFields['city']}
            onFocus={() => unlockField('city')}
            onPointerDown={() => unlockField('city')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City / District"
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* State */}
        <div>
          <label htmlFor="widget_state" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            State <span className="text-rose-500">*</span>
          </label>
          <input
            id="widget_state"
            name="widget_state"
            type="text"
            autoComplete="off"
            readOnly={!unlockedFields['state']}
            onFocus={() => unlockField('state')}
            onPointerDown={() => unlockField('state')}
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Optional Coordinates display / inputs for Mandi / Weather setup */}
      {showCoordinates && setLatitude && setLongitude && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Latitude (°N)
            </label>
            <input
              type="number"
              step="any"
              value={latitude !== undefined ? latitude : ''}
              onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g. 15.8281"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Longitude (°E)
            </label>
            <input
              type="number"
              step="any"
              value={longitude !== undefined ? longitude : ''}
              onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g. 78.0373"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAutofillWidget;
