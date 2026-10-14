import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Truck,
  Phone,
  ShieldCheck,
  RefreshCw,
  Navigation,
  Clock,
  Gauge,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { getOrderTrackingApi } from '../../services/api';
import { TrackingTelemetry } from '../../types/order';
import { useTranslation } from '../../context/LanguageContext';

interface DeliveryTrackingModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export const DeliveryTrackingModal: React.FC<DeliveryTrackingModalProps> = ({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onOpenChat,
}) => {
  const { t } = useTranslation();
  const [telemetry, setTelemetry] = useState<TrackingTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation playback state
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const simIntervalRef = useRef<any>(null);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrderTrackingApi(orderId);
      if (res.success && res.telemetry) {
        setTelemetry(res.telemetry);
        setSimulatedProgress(res.telemetry.route.progressPercent);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load real-time telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelemetry();
    } else {
      setIsPlaying(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }
  }, [isOpen, orderId]);

  // Simulation loop
  useEffect(() => {
    if (!isOpen || !isPlaying || !telemetry) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    simIntervalRef.current = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 100) {
          return 0; // loop back for continuous interactive visualization
        }
        return Math.min(100, prev + 0.4 * simSpeed);
      });
    }, 100);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isOpen, isPlaying, simSpeed, telemetry]);

  if (!isOpen) return null;

  // Calculate coordinates along SVG path
  const waypoints = telemetry?.route?.waypoints || [];
  const svgWidth = 600;
  const svgHeight = 360;

  // Map lat/long to SVG canvas coordinates
  const minLat = Math.min(...(waypoints.map((w) => w.latitude) || [15.8]));
  const maxLat = Math.max(...(waypoints.map((w) => w.latitude) || [15.9]));
  const minLng = Math.min(...(waypoints.map((w) => w.longitude) || [78.0]));
  const maxLng = Math.max(...(waypoints.map((w) => w.longitude) || [78.1]));

  const latSpan = Math.max(0.001, maxLat - minLat);
  const lngSpan = Math.max(0.001, maxLng - minLng);

  const projectPoint = (lat: number, lng: number) => {
    // Normalise with 60px margin
    const margin = 50;
    const x = margin + ((lng - minLng) / lngSpan) * (svgWidth - margin * 2);
    // Invert Y so north is top
    const y = svgHeight - margin - ((lat - minLat) / latSpan) * (svgHeight - margin * 2);
    return { x, y };
  };

  const projectedWaypoints = waypoints.map((w) => projectPoint(w.latitude, w.longitude));

  // Build SVG path string with smooth bezier curves
  let svgPathD = '';
  if (projectedWaypoints.length > 0) {
    svgPathD = `M ${projectedWaypoints[0].x} ${projectedWaypoints[0].y}`;
    for (let i = 1; i < projectedWaypoints.length; i++) {
      const prev = projectedWaypoints[i - 1];
      const curr = projectedWaypoints[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      svgPathD += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
    }
    const last = projectedWaypoints[projectedWaypoints.length - 1];
    svgPathD += ` T ${last.x} ${last.y}`;
  }

  // Calculate current interpolated position of vehicle
  const totalSteps = projectedWaypoints.length - 1;
  const currentStep = Math.min(totalSteps, Math.floor((simulatedProgress / 100) * totalSteps));
  const nextStep = Math.min(totalSteps, currentStep + 1);
  const stepFraction = totalSteps > 0 ? (simulatedProgress / 100) * totalSteps - currentStep : 0;

  const vehiclePos =
    projectedWaypoints.length > 0
      ? {
          x:
            projectedWaypoints[currentStep].x +
            (projectedWaypoints[nextStep].x - projectedWaypoints[currentStep].x) * stepFraction,
          y:
            projectedWaypoints[currentStep].y +
            (projectedWaypoints[nextStep].y - projectedWaypoints[currentStep].y) * stepFraction,
        }
      : { x: svgWidth / 2, y: svgHeight / 2 };

  // Angle of vehicle
  const dx = (projectedWaypoints[nextStep]?.x || 0) - (projectedWaypoints[currentStep]?.x || 0);
  const dy = (projectedWaypoints[nextStep]?.y || 0) - (projectedWaypoints[currentStep]?.y || 0);
  const vehicleAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const currentDistKm = telemetry
    ? Math.max(0, (telemetry.route.totalDistanceKm * (1 - simulatedProgress / 100))).toFixed(1)
    : '0';

  const currentEtaMins = telemetry
    ? Math.max(1, Math.round(Number(currentDistKm) * 2.2))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  {t('liveTrackingTitle', 'Live Farm Dispatch Tracking')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {telemetry?.status || 'IN_TRANSIT'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('orderNumber', 'Order #')}{orderNumber} • {t('liveSimulationActive', 'Real-time GPS & Road Simulation')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTelemetry}
              disabled={loading}
              title="Refresh GPS telemetry"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Interactive Simulation Map Canvas */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-inner">
            {/* Map Background Grid & Agricultural Terrain Patterns */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
            
            {/* Top HUD Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700 text-white shadow-xl text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
                <span>{t('liveSimulationActive', 'Live Route Simulation')}</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-emerald-400 font-extrabold">{simulatedProgress.toFixed(0)}% {t('completed', 'Completed')}</span>
              </div>

              {/* Simulation Player Controls */}
              <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700 text-white shadow-xl">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setSimulatedProgress(0)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition"
                  title="Reset to Origin"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      simSpeed === spd
                        ? 'bg-slate-700 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Map */}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-64 sm:h-80 select-none block"
            >
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Stylized Field & Canal Contours */}
              <path
                d="M 20,40 Q 180,120 300,60 T 580,90"
                fill="none"
                stroke="#1e3a2b"
                strokeWidth="24"
                opacity="0.4"
                strokeLinecap="round"
              />
              <path
                d="M 60,320 Q 220,240 380,310 T 540,250"
                fill="none"
                stroke="#164e63"
                strokeWidth="18"
                opacity="0.3"
                strokeLinecap="round"
              />

              {/* Highway Outer Casing */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Active Route Glow */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 4"
                  filter="url(#glow)"
                  className="animate-pulse"
                />
              )}

              {/* Waypoint Nodes */}
              {projectedWaypoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#06b6d4"
                  opacity={i === 0 || i === projectedWaypoints.length - 1 ? 0 : 0.6}
                />
              ))}

              {/* Origin Marker (Agri Store) */}
              {projectedWaypoints.length > 0 && (
                <g transform={`translate(${projectedWaypoints[0].x}, ${projectedWaypoints[0].y})`}>
                  <circle r="18" fill="#10b981" opacity="0.2" className="animate-ping" />
                  <circle r="12" fill="#047857" stroke="#ffffff" strokeWidth="2.5" />
                  <text
                    y="-18"
                    textAnchor="middle"
                    fill="#10b981"
                    fontSize="11"
                    fontWeight="800"
                    className="drop-shadow-md"
                  >
                    🏪 {telemetry?.origin.name || 'Agri Store'}
                  </text>
                </g>
              )}

              {/* Destination Marker (Farmer Gate) */}
              {projectedWaypoints.length > 1 && (
                <g
                  transform={`translate(${
                    projectedWaypoints[projectedWaypoints.length - 1].x
                  }, ${projectedWaypoints[projectedWaypoints.length - 1].y})`}
                >
                  <circle r="22" fill="#3b82f6" opacity="0.2" className="animate-ping" />
                  <circle r="14" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2.5" />
                  <text
                    y="26"
                    textAnchor="middle"
                    fill="#60a5fa"
                    fontSize="11"
                    fontWeight="800"
                    className="drop-shadow-md"
                  >
                    🌾 Farm Delivery Gate
                  </text>
                </g>
              )}

              {/* Dynamic Vehicle Marker */}
              {projectedWaypoints.length > 0 && (
                <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`}>
                  {/* Headlight illumination beam */}
                  <path
                    d="M 0 0 L 35 -14 L 35 14 Z"
                    fill="url(#routeGradient)"
                    opacity="0.35"
                    transform={`rotate(${vehicleAngle})`}
                  />
                  {/* Vehicle Body Bubble */}
                  <circle r="14" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
                  <g transform={`rotate(${vehicleAngle})`}>
                    <polygon points="8,0 -6,-6 -2,0 -6,6" fill="#10b981" />
                  </g>
                  {/* Speed tooltip */}
                  <rect
                    x="-24"
                    y="-28"
                    width="48"
                    height="16"
                    rx="8"
                    fill="#0284c7"
                    opacity="0.95"
                  />
                  <text
                    y="-17"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="900"
                  >
                    {simulatedProgress >= 100 ? 'ARRIVED' : `${(32 + (simulatedProgress % 7)).toFixed(0)} km/h`}
                  </text>
                </g>
              )}
            </svg>

            {/* Bottom Floating Telemetry Dashboard */}
            <div className="absolute bottom-3 left-3 right-3 z-10 grid grid-cols-3 gap-2 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/80 text-white shadow-2xl">
              <div className="flex items-center gap-2 border-r border-slate-700/60 pr-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('estimatedArrival', 'Est. Time')}</span>
                  <span className="text-xs sm:text-sm font-heading font-black text-white">
                    {simulatedProgress >= 100 ? t('timelineDelivered', 'At Location') : `~${currentEtaMins} mins`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-r border-slate-700/60 pr-2">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('distanceLabel', 'Remaining')}</span>
                  <span className="text-xs sm:text-sm font-heading font-black text-emerald-400">
                    {simulatedProgress >= 100 ? '0 km' : `${currentDistKm} km`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">{t('speedLabel', 'Vehicle Speed')}</span>
                  <span className="text-xs sm:text-sm font-heading font-black text-amber-300">
                    {simulatedProgress >= 100 ? '0 km/h' : '34 km/h'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Courier & OTP Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Courier Profile */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-heading font-black text-lg shadow-md shrink-0">
                  {telemetry?.deliveryPartner.name.charAt(0) || 'D'}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading font-bold text-slate-900 dark:text-white">
                      {telemetry?.deliveryPartner.name || t('deliveryPartnerLabel', 'Assigned Courier Partner')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      {t('genuineGuarantee', 'Verified')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {telemetry?.deliveryPartner.vehicleType || 'Two-Wheeler Partner'} • {telemetry?.deliveryPartner.deliveryArea}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {telemetry?.deliveryPartner.phone && (
                  <a
                    href={`tel:${telemetry.deliveryPartner.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t('callPartnerBtn', 'Call Courier')}</span>
                  </a>
                )}
                {onOpenChat && (
                  <button
                    onClick={onOpenChat}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  >
                    <span>{t('chatWithStoreBtn', 'Open Chat')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Handover OTP Verification Card */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                {t('handoverOtp', 'Handover Verification OTP')}
              </span>
              <div className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-amber-900 dark:text-amber-200 py-1 px-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 shadow-sm">
                {telemetry?.deliveryOtp || '8419'}
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
                {t('shareOtpNote', 'Share with courier upon delivery verification')}
              </span>
            </div>
          </div>

          {/* Delivery Milestone Progress Stepper */}
          {telemetry?.milestones && telemetry.milestones.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                {t('orderTimeline', 'Shipment Progression Status')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {telemetry.milestones.map((m) => (
                  <div
                    key={m.step}
                    className={`p-3 rounded-xl border transition-all ${
                      m.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 shadow-sm'
                        : m.done
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          m.done
                            ? 'bg-emerald-600 text-white'
                            : m.active
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {m.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : m.step}
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {m.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
