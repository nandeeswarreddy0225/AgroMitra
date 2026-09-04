import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  RefreshCw,
  MapPin,
  Compass,
  AlertCircle,
  Loader2,
  Edit3,
  Check,
  X,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { getLiveWeatherApi } from '../../services/api';
import { WeatherData } from '../../types/weather';
import { useAuth } from '../../context/AuthContext';

interface LiveWeatherCardProps {
  initialCity?: string;
  initialState?: string;
  className?: string;
  onWeatherLoaded?: (weather: WeatherData) => void;
}

type LocationMode = 'live_gps' | 'saved_profile' | 'custom';

export const LiveWeatherCard: React.FC<LiveWeatherCardProps> = ({
  initialCity,
  initialState,
  className = '',
  onWeatherLoaded,
}) => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [timeAgoText, setTimeAgoText] = useState<string>('Just now');
  const [locationMode, setLocationMode] = useState<LocationMode>('saved_profile');

  // Custom location edit drawer
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [customCity, setCustomCity] = useState<string>('');
  const [customState, setCustomState] = useState<string>('');
  const [isLocatingGeo, setIsLocatingGeo] = useState<boolean>(false);

  // Active query coords / city
  const activeLocationRef = useRef<{
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
  }>({});

  const fetchWeather = useCallback(
    async (
      params?: { lat?: number; lon?: number; city?: string; state?: string },
      modeOverride?: LocationMode
    ) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const queryParams = params || activeLocationRef.current;
        const res = await getLiveWeatherApi(queryParams);
        if (res.success && res.weather) {
          setWeather(res.weather);
          if (onWeatherLoaded) {
            onWeatherLoaded(res.weather);
          }
          setLastFetchTime(Date.now());
          if (modeOverride) {
            setLocationMode(modeOverride);
          }
          activeLocationRef.current = {
            lat: res.weather.location.latitude,
            lon: res.weather.location.longitude,
            city: res.weather.location.city,
            state: res.weather.location.state,
          };
        } else {
          setErrorMsg(res.message || 'Unable to load live weather right now.');
        }
      } catch (err: any) {
        setErrorMsg('Unable to load live weather right now. Please check your network connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [onWeatherLoaded]
  );


  // Browser Geolocation Function
  const handleUseBrowserLocation = useCallback(
    (isInitialAutoCheck: boolean = false) => {
      if (!navigator.geolocation) {
        if (!isInitialAutoCheck) {
          setErrorMsg('Geolocation is not supported by your browser.');
        }
        const profileCity = user?.address?.city || initialCity;
        const profileState = user?.address?.state || initialState;
        if (profileCity) {
          activeLocationRef.current = { city: profileCity, state: profileState };
          fetchWeather({ city: profileCity, state: profileState }, 'saved_profile');
        } else {
          activeLocationRef.current = { city: 'Nagpur', state: 'Maharashtra' };
          fetchWeather({ city: 'Nagpur', state: 'Maharashtra' }, 'custom');
        }
        return;
      }

      setIsLocatingGeo(true);
      if (!isInitialAutoCheck) {
        setIsLoading(true);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingGeo(false);
          const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          activeLocationRef.current = coords;
          setIsEditingLocation(false);
          fetchWeather(coords, 'live_gps');
        },
        (err) => {
          setIsLocatingGeo(false);
          console.warn('[LiveWeatherCard] Geolocation error or denied:', err.message);

          if (!isInitialAutoCheck) {
            if (err.code === 1 /* PERMISSION_DENIED */) {
              setErrorMsg('Location permission was denied. Please allow GPS location in your browser or search for your farm location below.');
            } else {
              setErrorMsg('GPS location is temporarily unavailable. Switched to farm location.');
            }
          }

          // Fallback to profile location if available
          const profileCity = user?.address?.city || initialCity;
          const profileState = user?.address?.state || initialState;
          if (profileCity) {
            activeLocationRef.current = { city: profileCity, state: profileState };
            fetchWeather({ city: profileCity, state: profileState }, 'saved_profile');
          } else {
            activeLocationRef.current = { city: 'Nagpur', state: 'Maharashtra' };
            fetchWeather({ city: 'Nagpur', state: 'Maharashtra' }, 'custom');
          }
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    },
    [user?.address?.city, user?.address?.state, initialCity, initialState, fetchWeather]
  );

  // On initial mount: Attempt current browser location FIRST
  useEffect(() => {
    handleUseBrowserLocation(true);
  }, [handleUseBrowserLocation]);

  // Periodic refresh & "Time ago" updater
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastFetchTime) {
        const diffSec = Math.floor((Date.now() - lastFetchTime) / 1000);
        if (diffSec < 60) {
          setTimeAgoText('Just now');
        } else if (diffSec < 3600) {
          const mins = Math.floor(diffSec / 60);
          setTimeAgoText(`${mins} min${mins > 1 ? 's' : ''} ago`);
        } else {
          const hours = Math.floor(diffSec / 3600);
          setTimeAgoText(`${hours} hour${hours > 1 ? 's' : ''} ago`);
        }
      }
    }, 15000);

    // Auto-refresh data every 10 minutes
    const autoRefreshInterval = setInterval(() => {
      fetchWeather();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(autoRefreshInterval);
    };
  }, [lastFetchTime, fetchWeather]);

  const handleCustomLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCity.trim()) return;

    const newLoc = {
      city: customCity.trim(),
      state: customState.trim() || undefined,
    };
    activeLocationRef.current = newLoc;
    setIsEditingLocation(false);
    fetchWeather(newLoc, 'custom');
  };

  const getWeatherConditionIcon = (code: number) => {
    if (code === 0) return <span className="text-3xl">☀️</span>;
    if (code >= 1 && code <= 3) return <span className="text-3xl">⛅</span>;
    if (code >= 51 && code <= 67) return <span className="text-3xl">🌧️</span>;
    if (code >= 80 && code <= 82) return <span className="text-3xl">🌦️</span>;
    if (code >= 95) return <span className="text-3xl">⛈️</span>;
    return <CloudSun className="w-8 h-8 text-amber-500" />;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors ${className}`}
    >
      {/* 1. Header Bar: Title, Location Badge, Live GPS Action & Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        
        {/* Left: Weather Title & Location Tag */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Live Farm Weather
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live meteorological feed" />
            </div>

            {weather && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {weather.location.city}
                    {weather.location.state ? `, ${weather.location.state}` : ''}
                  </span>
                </div>

                {/* Source Badge */}
                {locationMode === 'live_gps' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    <Navigation className="w-2.5 h-2.5" />
                    <span>Live GPS Location</span>
                  </span>
                ) : locationMode === 'saved_profile' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                    <span>Using saved farm location</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                    <span>Custom search</span>
                  </span>
                )}

                <button
                  onClick={() => {
                    setCustomCity(weather.location.city || '');
                    setCustomState(weather.location.state || '');
                    setIsEditingLocation(!isEditingLocation);
                  }}
                  className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs transition-colors flex items-center gap-0.5 ml-1"
                  title="Search / Change Location"
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="text-[11px] underline">Change</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions (Use Current Location, Timestamp, Refresh) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Use Current Location Button */}
          <button
            onClick={() => handleUseBrowserLocation(false)}
            disabled={isLocatingGeo || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            title="Detect and use current device location"
          >
            {isLocatingGeo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Use Current Location</span>
          </button>

          {/* Timestamp Indicator */}
          {lastFetchTime && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60">
              {weather?.cached ? `Cached • ${timeAgoText}` : `Updated ${timeAgoText}`}
            </span>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchWeather()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors disabled:opacity-50"
            title="Refresh Live Weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Change Location Drawer / Search Form */}
      {isEditingLocation && (
        <form
          onSubmit={handleCustomLocationSubmit}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Select or Enter Farm Location for Real-Time Forecast
            </span>
            <button
              type="button"
              onClick={() => setIsEditingLocation(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="City / Mandal / Town (e.g. Bengaluru, Kurnool, Guntur)"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="State (e.g. Karnataka, Andhra Pradesh, Telangana)"
              value={customState}
              onChange={(e) => setCustomState(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleUseBrowserLocation(false)}
              disabled={isLocatingGeo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold hover:bg-emerald-100 transition-colors"
            >
              {isLocatingGeo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
              <span>Detect My GPS Coordinates</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Location</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Loading State */}
      {isLoading && !weather && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            🌦️ Detecting location and loading live weather from meteorological sensors...
          </p>
        </div>
      )}

      {/* 4. Error State */}
      {errorMsg && !weather && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
          <button
            onClick={() => fetchWeather()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 5. Live Weather Data Display */}
      {weather && (
        <div className="space-y-4">
          {/* Main Hero Weather Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3.5">
              <div className="shrink-0">{getWeatherConditionIcon(weather.conditionCode)}</div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading font-black text-slate-900 dark:text-white">
                    {weather.temperature}°C
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {weather.condition}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Feels like: <strong>{weather.feelsLike}°C</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span
                className={`px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                  weather.rainProbability >= 50
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Rain Probability: {weather.rainProbability}%</span>
              </span>

              {weather.cached && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ⚡ Cached
                </span>
              )}
            </div>
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {/* Temperature */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                <span>Temperature</span>
              </div>
              <p className="text-xl font-heading font-black text-slate-900 dark:text-white">
                {weather.temperature}°C
              </p>
              <span className="text-[10px] text-slate-400">Feels {weather.feelsLike}°C</span>
            </div>

            {/* Rain Chance */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>Rain Chance</span>
              </div>
              <p
                className={`text-xl font-heading font-black ${
                  weather.rainProbability >= 40
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {weather.rainProbability}%
              </p>
              <span className="text-[10px] text-slate-400">
                Precip: {weather.precipitation.toFixed(1)} mm
              </span>
            </div>

            {/* Humidity */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                <span>Humidity</span>
              </div>
              <p className="text-xl font-heading font-black text-slate-900 dark:text-white">
                {weather.humidity}%
              </p>
              <span className="text-[10px] text-slate-400">Relative moisture</span>
            </div>

            {/* Wind Speed */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Wind className="w-3.5 h-3.5 text-indigo-500" />
                <span>Wind Speed</span>
              </div>
              <p className="text-xl font-heading font-black text-slate-900 dark:text-white">
                {weather.windSpeed} <span className="text-xs font-normal">km/h</span>
              </p>
              <span className="text-[10px] text-slate-400">10m surface wind</span>
            </div>
          </div>

          {/* Dynamic Agronomic Advisory */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Real-Time Farm Advisory:</span>
            </div>
            <p className="leading-relaxed font-medium">{weather.advisory}</p>
          </div>
        </div>
      )}
    </div>
  );
};
