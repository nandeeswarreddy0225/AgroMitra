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
} from 'lucide-react';
import { analyzeCropImageApi, getCropAnalysisHistoryApi, deleteCropAnalysisApi } from '../../services/api';
import { CropAnalysis } from '../../types/cropHealth';
import { useTranslation } from '../../context/LanguageContext';
import axios from 'axios';

export const CropDiseasePage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<CropAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<CropAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { t } = useTranslation();

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

  // Stop current active media stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start media stream for live camera scanner
  const startCameraStream = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    stopCameraStream();
    setCameraError(null);
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera unavailable. You can upload a leaf image instead.');
      setActiveMode('upload');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access request error:', err);
      setCameraError('Camera unavailable. You can upload a leaf image instead.');
      setActiveMode('upload');
    }
  }, [stopCameraStream]);

  // Handle switching mode
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage('Failed to capture frame from camera.');
        return;
      }

      const file = new File([blob], `leaf-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setErrorMessage(null);
      stopCameraStream();
    }, 'image/jpeg', 0.92);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, or WebP).');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('File size exceeds 10MB limit. Please upload a smaller image.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopCameraStream();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please upload an image file of the crop leaf to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await analyzeCropImageApi(selectedFile);
      if (res.success && res.analysis) {
        setCurrentResult(res.analysis);
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
        setErrorMessage('AI Service communication failed. Ensure backend & AI service are active.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  // Helper to determine suggested treatment search keyword
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
      {/* Hidden canvas for snapshot capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Computer Vision & Deep Learning Pathology</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold text-white">
            {t('navLeafScanner', 'AI Crop Health & Leaf Scanner')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
            Scan crop foliage using your phone camera or upload a leaf photo to identify foliar blights, viral curled leaves, mildew, or nutrient chlorosis with instant agronomic remedy suggestions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/15 text-center">
            <div className="text-xs text-emerald-300 font-bold">Model</div>
            <div className="text-sm font-heading font-black text-white">MobileNetV3</div>
          </div>
          <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/15 text-center">
            <div className="text-xs text-emerald-300 font-bold">Accuracy</div>
            <div className="text-sm font-heading font-black text-white">Calibrated</div>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Camera Viewfinder / Capture Box */}
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
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('camera');
                    if (previewUrl) handleResetScanner();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeMode === 'camera'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Phone Camera</span>
                </button>
              </div>
            </div>

            {/* Viewfinder / Preview Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
              
              {previewUrl ? (
                /* Static Captured / Uploaded Image Preview */
                <div className="relative w-full h-full">
                  <img
                    src={previewUrl}
                    alt="Captured Leaf Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleResetScanner}
                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-sm shadow-md transition-colors"
                    title="Retake or choose another photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-bold backdrop-blur-sm">
                    Image Ready for AI Analysis
                  </div>
                </div>
              ) : activeMode === 'camera' ? (
                /* Real Live Camera Viewfinder */
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Targeting frame overlay */}
                  <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Camera Controls Bar */}
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 transition-all shadow-md backdrop-blur-sm"
                      title="Flip Camera (Front/Rear)"
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
                      <span>Capture Leaf</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 transition-all shadow-md backdrop-blur-sm"
                      title="Upload from Gallery"
                    >
                      <UploadCloud className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* File / Gallery Upload Box */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-white">Click or Drag & Drop Crop Leaf Photo</p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, or WebP up to 10MB</p>
                </div>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{cameraError}</span>
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
                    <span>Analyzing Foliar Pathology...</span>
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
                        Unable to confidently identify the disease
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        The AI model could not detect definitive foliar pathology patterns.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">{currentResult.crop}</h3>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{currentResult.disease}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {previewUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs" title="Image analyzed">
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


              {/* Detected Symptoms */}
              {currentResult.symptoms && currentResult.symptoms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Observed Foliar Symptoms:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {currentResult.symptoms.map((symptom, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Agronomic Actions */}
              {currentResult.recommendedActions && currentResult.recommendedActions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Agronomic Remedies & Field Practice:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {currentResult.recommendedActions.map((action, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100/60 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Treatment & Direct Marketplace Link */}
              {!currentResult.isHealthy && (
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
                {currentResult.disclaimer || 'AI crop diagnosis is for informational guidance only. Verify with your local Agricultural Officer.'}
              </div>

            </div>
          ) : (
            /* Standby Card */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm min-h-[380px] flex flex-col items-center justify-center transition-colors">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">Awaiting Crop Leaf Image</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Take a close-up photo of the affected plant leaf or upload a photo from your gallery. The AI model will extract necrotic, chlorotic, and pustule patterns in real-time.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Farmer's Past Scans History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">Recent Crop Health Diagnoses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your historical pathology reports stored in MongoDB</p>
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
