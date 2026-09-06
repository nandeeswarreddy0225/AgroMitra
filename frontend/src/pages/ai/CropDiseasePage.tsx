import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Activity,
  Calendar,
  Trash2,
  Stethoscope,
  SwitchCamera,
  X,
  Search,
  Leaf,
  CheckCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { analyzeCropImageApi, getCropAnalysisHistoryApi, deleteCropAnalysisApi } from '../../services/api';
import { CropAnalysis } from '../../types/cropHealth';
import { useTranslation } from '../../context/LanguageContext';
import axios from 'axios';

export const CropDiseasePage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('camera');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<CropAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTop5, setShowTop5] = useState(false);

  // Real-time camera & diagnostics state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Diagnostic metrics
  const [browserSupport, setBrowserSupport] = useState<'PASS' | 'FAIL'>('PASS');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');
  const [cameraStreamDetails, setCameraStreamDetails] = useState<string>('Inactive');
  const [fileDetails, setFileDetails] = useState<string>('No file selected');

  // History state
  const [history, setHistory] = useState<CropAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { t } = useTranslation();

  // Check browser camera support & permission status
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setBrowserSupport('PASS');
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'camera' as PermissionName })
          .then((perm) => {
            setPermissionStatus(perm.state as 'granted' | 'prompt' | 'denied');
            perm.onchange = () => {
              setPermissionStatus(perm.state as 'granted' | 'prompt' | 'denied');
            };
          })
          .catch(() => {
            setPermissionStatus('prompt');
          });
      } else {
        setPermissionStatus('prompt');
      }
    } else {
      setBrowserSupport('FAIL');
      setPermissionStatus('denied');
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getCropAnalysisHistoryApi();
      if (res.success && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch {
      // Non-fatal error for history
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Stop active media stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraStreamDetails('Inactive');
  }, []);

  // Start media stream with resilient fallbacks
  const startCameraStream = useCallback(
    async (facing: 'environment' | 'user' = 'environment') => {
      stopCameraStream();
      setCameraError(null);
      setErrorMessage(null);
      setIsStartingCamera(true);

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setBrowserSupport('FAIL');
        setCameraError('WebRTC camera is not supported by your current browser. Please use the Direct Phone Camera button below.');
        setIsStartingCamera(false);
        return;
      }

      const tryConstraints = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
        return await navigator.mediaDevices.getUserMedia(constraints);
      };

      try {
        let stream: MediaStream | null = null;
        try {
          // Attempt 1: Ideal rear/front facing with HD resolution
          stream = await tryConstraints({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
            },
            audio: false,
          });
        } catch {
          try {
            // Attempt 2: Basic facing mode constraint
            stream = await tryConstraints({
              video: { facingMode: facing },
              audio: false,
            });
          } catch {
            // Attempt 3: Any available video stream
            stream = await tryConstraints({
              video: true,
              audio: false,
            });
          }
        }

        if (stream) {
          streamRef.current = stream;
          setPermissionStatus('granted');

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            const track = stream.getVideoTracks()[0];
            const settings = track ? track.getSettings() : null;
            const resText = settings && settings.width && settings.height
              ? `${settings.width}x${settings.height} (${facing === 'environment' ? 'Rear Camera' : 'Front Camera'})`
              : `Active (${facing === 'environment' ? 'Rear Camera' : 'Front Camera'})`;
            setCameraStreamDetails(resText);
          }
          setIsCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera stream request error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionStatus('denied');
          setCameraError('Camera permission was denied. Tap the lock icon in Chrome address bar -> Site settings -> Camera -> Allow, or use the Phone Camera button below.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No physical camera device was detected on this device.');
        } else {
          setCameraError('Unable to open live camera stream. You can tap "Open Phone Camera" below to use your native Android camera.');
        }
        setIsCameraActive(false);
        setCameraStreamDetails('Unavailable');
      } finally {
        setIsStartingCamera(false);
      }
    },
    [stopCameraStream]
  );

  // Manage camera lifecycle when mode changes
  useEffect(() => {
    if (activeMode === 'camera' && !previewUrl) {
      startCameraStream(cameraFacing);
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [activeMode, cameraFacing, previewUrl, startCameraStream, stopCameraStream]);

  // Flip front / rear camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCameraStream(nextFacing);
  };

  // Capture snapshot from video stream
  const captureSnapshot = () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('Failed to capture frame from camera stream.');
          return;
        }

        const file = new File([blob], `leaf-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setFileDetails(`Live Capture: ${(file.size / (1024 * 1024)).toFixed(2)} MB JPEG (${canvas.width}x${canvas.height})`);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setErrorMessage(null);
        stopCameraStream();
      },
      'image/jpeg',
      0.95
    );
  };

  // Handle file chosen from Gallery or Native Camera Capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, or WebP).');
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileDetails('Invalid file format');
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller photo.');
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileDetails('File exceeds 10MB');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setFileDetails(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB, ${file.type})`);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopCameraStream();
  };

  // Run AI analysis
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please capture or upload a leaf photograph before running diagnosis.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await analyzeCropImageApi(selectedFile);
      if (res.success && res.analysis) {
        setCurrentResult(res.analysis);
        setShowTop5(true);
        fetchHistory();
      } else {
        setErrorMessage(res.message || 'Analysis failed. Please try again.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('AI Service communication failed. Ensure the API service is reachable.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetScanner = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCurrentResult(null);
    setErrorMessage(null);
    setFileDetails('No file selected');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
    if (activeMode === 'camera') {
      startCameraStream(cameraFacing);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await deleteCropAnalysisApi(id);
      if (res.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id && (item as any)._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  const getTreatmentKeyword = (diseaseName: string) => {
    const lower = diseaseName.toLowerCase();
    if (lower.includes('blight') || lower.includes('mold') || lower.includes('rust') || lower.includes('scab')) {
      return 'Fungicides';
    }
    if (lower.includes('virus') || lower.includes('whitefly') || lower.includes('pest') || lower.includes('insect')) {
      return 'Insecticides';
    }
    if (lower.includes('bacterial')) {
      return 'Bio Products';
    }
    return 'Crop Protection Products';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Multi-Crop Deep Learning Vision (PyTorch MobileNetV3)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold text-white">
            {t('navLeafScanner', 'AI Crop Health & Leaf Scanner')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
            Scan crop leaves live using your Android phone camera or upload a field photograph. Real deep convolutional neural inference classifies foliar pathology across Tomato, Potato, Corn, Pepper, Apple, Rice, and Cotton with strict out-of-distribution uncertainty handling.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/15 text-center">
            <div className="text-xs text-emerald-300 font-bold">Inference</div>
            <div className="text-sm font-heading font-black text-white">MobileNetV3</div>
          </div>
          <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/15 text-center">
            <div className="text-xs text-emerald-300 font-bold">Multi-Crop</div>
            <div className="text-sm font-heading font-black text-white">19 Classes</div>
          </div>
        </div>
      </div>

      {/* Real-time Diagnostics HUD Panel */}
      <div className="bg-slate-900/90 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Activity className="w-4 h-4" />
            <span>Camera & AI Pipeline Diagnostic Status</span>
          </div>
          <span className="text-[11px] text-slate-400">HTTPS Live Origin</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Browser Support</div>
            <div className="font-bold flex items-center gap-1 mt-0.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{browserSupport}</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Camera Permission</div>
            <div
              className={`font-bold mt-0.5 ${
                permissionStatus === 'granted'
                  ? 'text-emerald-400'
                  : permissionStatus === 'denied'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {permissionStatus.toUpperCase()}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Camera Stream</div>
            <div className="font-bold mt-0.5 truncate text-slate-200" title={cameraStreamDetails}>
              {cameraStreamDetails}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Capture Status</div>
            <div className="font-bold mt-0.5 text-slate-200">
              {previewUrl ? '✅ Captured' : isCameraActive ? '📷 Ready' : '⚪ Standby'}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Image File Status</div>
            <div className="font-bold mt-0.5 truncate text-slate-200" title={fileDetails}>
              {selectedFile ? '✅ Valid File' : '⚪ None'}
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">AI Pipeline</div>
            <div
              className={`font-bold mt-0.5 ${
                isAnalyzing ? 'text-amber-400 animate-pulse' : currentResult ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {isAnalyzing ? '⚡ Analyzing...' : currentResult ? '✅ Diagnosed' : '⚡ Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Camera Viewfinder / Capture Panel */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Leaf Image Capture</span>
              </h2>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('camera');
                    if (previewUrl) handleResetScanner();
                    else startCameraStream(cameraFacing);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeMode === 'camera'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('upload');
                    stopCameraStream();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeMode === 'upload'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>File Upload</span>
                </button>
              </div>
            </div>

            {/* Viewfinder Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
              {previewUrl ? (
                /* Captured / Uploaded Image Preview */
                <div className="relative w-full h-full">
                  <img src={previewUrl} alt="Captured Leaf" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleResetScanner}
                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-sm shadow-md transition-colors"
                    title="Retake photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-bold backdrop-blur-sm">
                    Image Captured & Ready
                  </div>
                </div>
              ) : activeMode === 'camera' ? (
                /* Live Camera Stream */
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {isStartingCamera && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-semibold">Opening phone camera stream...</span>
                    </div>
                  )}

                  {/* Targeting frame */}
                  {isCameraActive && (
                    <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                      </div>
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      </div>
                    </div>
                  )}

                  {/* Camera overlay controls */}
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-10">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 transition-all shadow-md backdrop-blur-sm"
                      title="Switch Front/Rear Camera"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={captureSnapshot}
                      disabled={!isCameraActive}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Camera className="w-5 h-5 text-slate-950" />
                      <span>Capture Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-emerald-400 border border-white/20 transition-all shadow-md backdrop-blur-sm"
                      title="Direct Phone Camera"
                    >
                      <Smartphone className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Gallery Upload Box */
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-white">Click or Drag Leaf Photo</p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, or WebP up to 10MB</p>
                </div>
              )}
            </div>

            {/* Hidden native camera capture inputs */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Direct Phone Camera Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Open Phone Camera (Direct Native)</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <span>Gallery</span>
              </button>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div>{cameraError}</div>
                  <button
                    type="button"
                    onClick={() => startCameraStream(cameraFacing)}
                    className="underline font-bold text-amber-900 dark:text-amber-100"
                  >
                    Tap to retry camera permission
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-sm transition-all shadow-md disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Executing Deep Neural Inference...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Run AI Diagnosis</span>
                  </>
                )}
              </button>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Diagnosis Results Display */}
        <div className="lg:col-span-6 space-y-6">
          {currentResult ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
              {/* Diagnosis Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crop Diagnosis</span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        !currentResult.isConfident
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : currentResult.isHealthy
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                      }`}
                    >
                      {!currentResult.isConfident
                        ? 'UNCERTAIN / LOW CONFIDENCE'
                        : currentResult.isHealthy
                        ? 'HEALTHY CROP'
                        : 'DISEASE IDENTIFIED'}
                    </span>
                  </div>

                  {!currentResult.isConfident ? (
                    <div className="mt-2 space-y-1">
                      <h3 className="text-xl font-heading font-black text-amber-700 dark:text-amber-400">
                        Unable to confidently identify this leaf
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        The leaf may be outside the model's supported crop families (Tomato, Potato, Corn, Pepper, Apple, Rice, Cotton) or the foliar symptoms are ambiguous. The AI does not guess or force a diagnosis.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">{currentResult.crop}</h3>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {currentResult.disease}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {previewUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
                      <img src={previewUrl} alt="Analyzed Leaf" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="text-right bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">AI Confidence</div>
                    <div className="text-lg font-heading font-black text-slate-900 dark:text-white">
                      {(currentResult.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 Predictions Accordion */}
              {currentResult.top5 && currentResult.top5.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowTop5(!showTop5)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Top 5 Model Predictions (Probability Distribution)</span>
                    </span>
                    {showTop5 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTop5 && (
                    <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                      {currentResult.top5.map((candidate, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {idx + 1}. {candidate.crop} — {candidate.disease}
                            </span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                              {(candidate.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
                              }`}
                              style={{ width: `${Math.max(4, candidate.probability * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Detected Symptoms */}
              {currentResult.symptoms && currentResult.symptoms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Observed Foliar Characteristics:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {currentResult.symptoms.map((symptom, idx) => (
                      <li
                        key={idx}
                        className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {currentResult.recommendedActions && currentResult.recommendedActions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Agronomic Remedies & Field Practice:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {currentResult.recommendedActions.map((action, idx) => (
                      <li
                        key={idx}
                        className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100/60 dark:border-emerald-800/60"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct Marketplace Link */}
              {!currentResult.isHealthy && currentResult.isConfident && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Suggested Treatment Category</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Sourced from verified Agri Store Partners with batch quality certification.
                  </p>

                  <Link
                    to={`/marketplace?category=${encodeURIComponent(getTreatmentKeyword(currentResult.disease))}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold transition-all shadow-sm"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search {getTreatmentKeyword(currentResult.disease)} in Marketplace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                {currentResult.disclaimer ||
                  'AI crop diagnosis is for informational guidance only. Verify with your local Agricultural Officer.'}
              </div>
            </div>
          ) : (
            /* Standby Card */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm min-h-[380px] flex flex-col items-center justify-center transition-colors">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Awaiting Leaf Photograph
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Take a photo using your live camera or upload a leaf photograph. The multi-crop neural network will analyze leaf morphology and color patterns.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Scans */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Recent Crop Health Diagnoses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Historical pathology records stored in MongoDB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
            No previous crop scans found. Scan your first leaf above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {history.map((record) => {
              const recId = record.id || (record as any)._id;
              return (
                <div
                  key={recId}
                  className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-heading font-bold text-slate-900 dark:text-white">{record.crop}</span>
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{record.disease}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(recId)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>{new Date(record.createdAt).toLocaleDateString('en-IN')}</span>
                    <span className="font-bold">{(record.confidence * 100).toFixed(0)}% Match</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
