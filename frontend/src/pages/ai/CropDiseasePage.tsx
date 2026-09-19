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
  Activity,
  Calendar,
  Trash2,
  Stethoscope,
  SwitchCamera,
  X,
  Leaf,
  CheckCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Bug,
  Lightbulb,
  MapPin,
  ShoppingCart,
  Truck,
  Check,
  Store,
} from 'lucide-react';
import {
  analyzeCropImageApi,
  getCropAnalysisHistoryApi,
  deleteCropAnalysisApi,
  createOrderApi,
} from '../../services/api';
import {
  CropAnalysis,
  StructuredRecommendation,
  RecommendedProduct,
} from '../../types/cropHealth';
import { useTranslation } from '../../context/LanguageContext';
import axios from 'axios';

export const CropDiseasePage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('camera');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<CropAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unsupportedInfo, setUnsupportedInfo] = useState<{ message: string; detectedCrop?: string } | null>(null);
  const [showTop5, setShowTop5] = useState(false);

  // Farmer Geolocation
  const [userLocation, setUserLocation] = useState<{ latitude?: number; longitude?: number }>({});

  // Direct Nearby Shop Ordering State (Part 7, 8, 9)
  const [orderingProduct, setOrderingProduct] = useState<RecommendedProduct | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'UPI_QR' | 'RAZORPAY'>('CASH_ON_DELIVERY');
  const [deliveryStreet, setDeliveryStreet] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<string>('');
  const [deliveryPincode, setDeliveryPincode] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; orderId: string } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

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
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Geolocation permission optional
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    }
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

  // Direct Order Modal Handlers (Part 7, 8, 9)
  const handleOpenOrderModal = (prod: RecommendedProduct) => {
    setOrderingProduct(prod);
    setOrderQuantity(1);
    setOrderPaymentMethod('CASH_ON_DELIVERY');
    setDeliveryStreet(prod.shop.address || 'Agricultural Field / Farm Gate');
    setDeliveryCity(prod.shop.city || 'Local District');
    setDeliveryPincode(prod.shop.pincode || '518001');
    setOrderSuccess(null);
    setOrderError(null);
  };

  const handleCloseOrderModal = () => {
    setOrderingProduct(null);
    setOrderSuccess(null);
    setOrderError(null);
  };

  const handleConfirmDirectOrder = async () => {
    if (!orderingProduct) return;
    setIsPlacingOrder(true);
    setOrderError(null);
    try {
      const res = await createOrderApi({
        productId: orderingProduct.productId,
        quantity: orderQuantity,
        shopOwnerId: orderingProduct.shop.shopOwnerId,
        deliveryAddress: {
          street: deliveryStreet.trim() || 'Agricultural Field / Farm Gate',
          city: deliveryCity.trim() || orderingProduct.shop.city || 'Local District',
          state: orderingProduct.shop.state || 'Andhra Pradesh',
          pincode: deliveryPincode.trim() || orderingProduct.shop.pincode || '518001',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        paymentMethod: orderPaymentMethod,
      });

      if (res.success && res.order) {
        setOrderSuccess({
          orderNumber: res.order.orderNumber,
          orderId: res.order.id || (res.order as any)._id || '',
        });
      } else {
        setOrderError(res.message || 'Failed to place order. Please try again.');
      }
    } catch (err: any) {
      setOrderError(
        err.response?.data?.message || err.message || 'Failed to place direct shop order.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Run AI analysis
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please capture or upload a crop leaf photograph before running diagnosis.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setUnsupportedInfo(null);
    setCurrentResult(null);

    try {
      const res = await analyzeCropImageApi(selectedFile, userLocation);
      if (res.success && res.isValid === true && res.is_valid !== false && (res.crop || res.species)) {
        const baseAnalysis = res.analysis || ({} as any);
        const speciesName = res.species || res.plant?.name || baseAnalysis.species || 'Crop';
        const fullResult: CropAnalysis = {
          ...baseAnalysis,
          id: baseAnalysis.id || String(Date.now()),
          farmer: baseAnalysis.farmer || '',
          imageName: baseAnalysis.imageName || selectedFile.name,
          crop: res.crop || speciesName,
          disease: res.condition || res.disease || baseAnalysis.disease || 'Healthy Crop',
          species: speciesName,
          isSupportedSpecies: true,
          confidence: res.confidence !== undefined ? res.confidence : (baseAnalysis.confidence ?? 0),
          speciesConfidence: res.speciesConfidence ?? (res.confidence !== undefined ? res.confidence : (baseAnalysis.confidence ?? 0)),
          diseaseConfidence: res.diseaseConfidence ?? (res.confidence !== undefined ? res.confidence : 0),
          speciesSource: res.speciesSource || 'EXISTING_ONNX',
          healthStatus: res.healthStatus || (res.is_healthy ? 'Healthy' : 'Disease Detected'),
          diagnosisStatus: res.diagnosisStatus || (res.is_healthy ? 'HEALTHY' : 'DIAGNOSED'),
          isHealthy: res.is_healthy !== undefined ? res.is_healthy : (baseAnalysis.isHealthy ?? false),
          isConfident: res.confidence !== undefined ? res.confidence >= 0.35 : (baseAnalysis.isConfident ?? true),
          isValid: true,
          is_valid: true,
          isPlant: true,
          products: res.products || [],
          nearbyShops: res.nearbyShops || [],
          plant: res.plant || baseAnalysis.plant,
          health: res.health || baseAnalysis.health,
          diagnosis: res.diagnosis !== undefined ? res.diagnosis : baseAnalysis.diagnosis,
          severity: res.severity || baseAnalysis.severity || 'None',
          recommendation: res.recommendation || baseAnalysis.recommendation,
          recommendations: res.recommendations || baseAnalysis.recommendedActions || [],
          safety_note: res.safety_note || (typeof res.recommendation === 'object' ? (res.recommendation as any)?.safety_note : undefined),
          top5: res.top5 || baseAnalysis.top5,
          symptoms: baseAnalysis.symptoms || [],
          recommendedActions: baseAnalysis.recommendedActions || res.recommendations || [],
          disclaimer: res.safety_note || baseAnalysis.disclaimer || 'AgroMitra AI decision-support tool.',
          createdAt: baseAnalysis.createdAt || new Date().toISOString(),
          updatedAt: baseAnalysis.updatedAt || new Date().toISOString(),
        };
        setCurrentResult(fullResult);
        setUnsupportedInfo(null);
        setShowTop5(true);
        fetchHistory();
      } else {
        const msg = res.message || 'Unable to confidently identify a supported plant species. Please upload a clear crop leaf photo.';
        setErrorMessage(msg);
        setUnsupportedInfo({ message: msg, detectedCrop: res.detectedCrop });
        setCurrentResult(null);
      }
    } catch (err: unknown) {
      setCurrentResult(null);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        setErrorMessage(msg);
        setUnsupportedInfo({ message: msg, detectedCrop: err.response.data.detectedCrop });
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
        setUnsupportedInfo({ message: err.message });
      } else {
        const msg = 'Unable to confidently identify a supported plant species. Please upload a clear crop leaf photo.';
        setErrorMessage(msg);
        setUnsupportedInfo({ message: msg });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetScanner = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCurrentResult(null);
    setUnsupportedInfo(null);
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
          {unsupportedInfo ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-rose-300 dark:border-rose-800 shadow-md space-y-6 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>UNSUPPORTED IMAGE</span>
                </span>
                {unsupportedInfo.detectedCrop && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Detected: {unsupportedInfo.detectedCrop}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xl font-heading font-black text-rose-700 dark:text-rose-400">
                  {unsupportedInfo.message}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  AgroMitra AI Scanner performs botanical species verification across all 18 supported crop types. Non-plant photos, blurry or blank images, background objects, and unsupported plant species are safely rejected to prevent inaccurate diagnoses.
                </p>
              </div>

              {previewUrl && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0">
                    <img src={previewUrl} alt="Rejected Specimen" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">Uploaded Specimen Rejected</div>
                    <div>Status: Unsupported or Non-Foliar Specimen</div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-heading font-extrabold text-sm transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Another Leaf / Upload Crop Leaf</span>
                </button>
              </div>
            </div>
          ) : currentResult ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
              {/* Diagnosis Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {(currentResult.plant?.name || currentResult.species || 'Crop')} Leaf Scanner
                    </span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>VALID {(currentResult.plant?.name || currentResult.species || 'CROP').toUpperCase()} LEAF</span>
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        (currentResult.health?.status === 'Healthy' || currentResult.isHealthy)
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : currentResult.diagnosisStatus === 'DISEASE_UNCERTAIN'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                      }`}
                    >
                      {(currentResult.health?.status === 'Healthy' || currentResult.isHealthy)
                        ? 'HEALTHY LEAF'
                        : currentResult.diagnosisStatus === 'DISEASE_UNCERTAIN'
                        ? 'PATHOLOGY UNCERTAIN'
                        : `${currentResult.health?.status?.toUpperCase() || 'DISEASED'}`}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SPECIES:</div>
                    <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                      {currentResult.crop}
                    </h3>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">DISEASE:</div>
                    <div className={`text-base font-bold mt-0.5 ${
                      (currentResult.health?.status === 'Healthy' || currentResult.isHealthy)
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : currentResult.diagnosisStatus === 'DISEASE_UNCERTAIN'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {currentResult.diagnosis?.name || currentResult.disease || (currentResult.diagnosisStatus === 'DISEASE_UNCERTAIN' ? 'Pathology Uncertain (Unconfirmed Foliar Symptoms)' : 'Healthy Crop')}
                    </div>
                  </div>
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
                      {currentResult.plant?.confidence ? `${currentResult.plant.confidence}%` : `${(currentResult.confidence * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Low-Confidence Warning Card */}
              {(!currentResult.isConfident || (currentResult.plant?.confidence !== undefined && currentResult.plant.confidence < 60) || currentResult.plant?.name === 'Unknown' || currentResult.crop === 'Unknown Plant') && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Low Confidence Notice</span>
                  </div>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                    The visual leaf characteristics could not be matched with high certainty. For accurate diagnosis, capture a sharp photo in natural daylight with the leaf blade covering at least 70% of the frame, or consult a qualified local Agriculture Officer (KVK / AEO).
                  </p>
                </div>
              )}

              {/* Universal Leaf Diagnostics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Plant Species */}
                <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      <span>🌿 Plant</span>
                    </span>
                    <span className="font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                      {currentResult.plant?.confidence ? `${currentResult.plant.confidence}%` : `${(currentResult.confidence * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="font-heading font-black text-base text-slate-900 dark:text-white">
                    {currentResult.plant?.displayName || currentResult.plant?.name || currentResult.crop}
                  </div>
                </div>

                {/* 2. Health Status */}
                <div className={`p-3.5 rounded-2xl border space-y-1 ${
                  (currentResult.health?.status === 'Healthy' || currentResult.isHealthy)
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/60'
                    : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/60'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      <span>❤️ Health Status</span>
                    </span>
                    <span className="font-mono px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                      {currentResult.health?.confidence ? `${currentResult.health.confidence}%` : `${(currentResult.confidence * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className={`font-heading font-black text-base ${
                    (currentResult.health?.status === 'Healthy' || currentResult.isHealthy)
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {currentResult.health?.status || (currentResult.isHealthy ? 'Healthy' : 'Diseased')}
                  </div>
                </div>
              </div>

              {/* 3. Diagnosis & Severity Card */}
              {(currentResult.diagnosis?.name || (!currentResult.isHealthy && currentResult.disease && currentResult.disease !== 'Healthy Crop (ఆరోగ్యకరమైన పంట)')) && (
                <div className="bg-amber-50/60 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Bug className="w-4 h-4 text-amber-600" />
                      <span>🦠 Disease / Defect Diagnosis</span>
                    </span>
                    {currentResult.severity && currentResult.severity !== 'None' && (
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                        currentResult.severity === 'Severe'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      }`}>
                        ⚠️ Severity: {currentResult.severity}
                      </span>
                    )}
                  </div>
                  <div className="font-heading font-black text-base text-slate-900 dark:text-white">
                    {currentResult.diagnosis?.name || currentResult.disease}
                  </div>
                  {currentResult.diagnosis?.confidence && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Diagnosis Confidence: <strong className="font-mono">{currentResult.diagnosis.confidence}%</strong>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Structured Agricultural Guidance Section */}
              {(() => {
                const structuredRec: StructuredRecommendation | null =
                  typeof currentResult.recommendation === 'object' && currentResult.recommendation !== null
                    ? (currentResult.recommendation as StructuredRecommendation)
                    : null;

                const explanationText =
                  structuredRec?.explanation ||
                  (typeof currentResult.recommendation === 'string'
                    ? currentResult.recommendation
                    : currentResult.recommendedActions?.[0] || 'Continue regular crop care and periodic scouting.');

                const fertilizerItems = structuredRec?.fertilizer || [];
                const diseaseMgmtItems = structuredRec?.disease_management || [];
                const preventionItems = structuredRec?.prevention || [];
                const safetyNoteText = structuredRec?.safety_note || currentResult.safety_note;

                return (
                  <div className="space-y-4">
                    {/* A. Diagnostic Explanation */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-1.5">
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>💡 Diagnostic Explanation & Rationale:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                        {explanationText}
                      </p>
                    </div>

                    {/* B. Disease Management & Direct Controls */}
                    {diseaseMgmtItems.length > 0 && (
                      <div className="bg-rose-50/60 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50 space-y-2">
                        <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            <span>🛡️ Targeted Disease Management & Remedies:</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full">
                            Pathology Control
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {diseaseMgmtItems.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-100/60 dark:border-rose-900/40"
                            >
                              <CheckCircle2 className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* C. Nutrient / Fertilizer Guidance */}
                    {fertilizerItems.length > 0 && (
                      <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-2">
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>🌱 Crop Nutrition & Soil Fertility Advice:</span>
                          </span>
                          <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                            Nutrition Only
                          </span>
                        </div>
                        {!currentResult.isHealthy && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Notice: Fertilizers promote vegetative vigor but DO NOT cure active fungal, bacterial, or viral disease infections.</span>
                          </div>
                        )}
                        <ul className="space-y-1.5">
                          {fertilizerItems.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-100/60 dark:border-emerald-900/40"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* D. Preventive Agronomic Measures */}
                    {preventionItems.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>🛡️ Proactive Prevention & Field Hygiene:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {preventionItems.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* E. Safety Note / Extension Officer Advisory */}
                    {safetyNoteText && (
                      <div className="bg-amber-50 dark:bg-amber-950/50 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="font-bold block">Agronomist Safety Advisory:</span>
                          <span className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px] block">
                            {safetyNoteText}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {/* Recommended Actions (Fallback for legacy string recommendations) */}
              {(!currentResult.recommendation || typeof currentResult.recommendation === 'string') && currentResult.recommendedActions && currentResult.recommendedActions.length > 0 && (
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

              {/* Part 6 & 7: RECOMMENDED PRODUCTS & DIRECT NEARBY SHOP ORDER */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-slate-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-emerald-950/40 border-2 border-emerald-200/90 dark:border-emerald-800/80 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm uppercase tracking-wider">
                    <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Recommended Products & Nearby Retail Stores</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Direct Farm Gate Dispatch
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Real stock verified directly from certified Agri Store Partners. Direct home or field delivery without requiring a physical shop visit.
                </p>

                {currentResult.products && currentResult.products.length > 0 ? (
                  <div className="space-y-3">
                    {currentResult.products.slice(0, 5).map((prod) => (
                      <div
                        key={prod.productId}
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading font-black text-sm text-slate-900 dark:text-white">
                              {prod.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {prod.category}
                            </span>
                            {prod.brand && prod.brand !== 'Generic' && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Brand: {prod.brand}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Store className="w-3.5 h-3.5 text-emerald-600" />
                              {prod.shop.shopName}
                            </span>
                            {prod.shop.distanceKm !== undefined && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-[11px] border border-emerald-200 dark:border-emerald-800">
                                <MapPin className="w-3 h-3" />
                                {prod.shop.distanceKm.toFixed(1)} km away
                              </span>
                            )}
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                              Stock: <strong className="text-slate-900 dark:text-white font-mono">{prod.stock} {prod.unit}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-right">
                            <div className="text-lg font-heading font-black text-slate-900 dark:text-white font-mono">
                              ₹{prod.price}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">per {prod.unit}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(prod)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-heading font-black shadow-sm transition-all"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>ORDER NOW</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      No matching product is currently available nearby.
                    </div>
                    <p className="text-[11px]">
                      AgroMitra only reflects real, verified retail inventory. You may also consult your local AEO officer.
                    </p>
                  </div>
                )}
              </div>

              {/* Scan Another Leaf Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-heading font-extrabold text-sm transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Another Leaf</span>
                </button>
              </div>

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

      {/* DIRECT NEARBY SHOP ORDER MODAL (Part 8 & 9) */}
      {orderingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseOrderModal}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {orderSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Order #{orderSuccess.orderNumber}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Your order has been routed to <strong>{orderingProduct.shop.shopName}</strong>. The retailer will pack and dispatch directly to your farm gate. No shop visit required!
                  </p>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/orders"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold shadow-md transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track Order in Farmer Orders</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleCloseOrderModal}
                    className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Direct Nearby Store Dispatch
                  </span>
                  <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                    Order from {orderingProduct.shop.shopName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {orderingProduct.shop.distanceKm !== undefined
                        ? `${orderingProduct.shop.distanceKm.toFixed(1)} km away`
                        : orderingProduct.shop.city || 'Verified Retail Partner'}
                    </span>
                  </div>
                </div>

                {/* Product Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      {orderingProduct.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      ₹{orderingProduct.price} per {orderingProduct.unit} • In Stock: {orderingProduct.stock}
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-black text-sm"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white px-2">
                      {orderQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderQuantity((q) => Math.min(orderingProduct.stock, q + 1))}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-black text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Delivery Address Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Delivery Address (Farm Gate / Residence)
                  </label>
                  <input
                    type="text"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="Street / Farm Gate / Landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      placeholder="Village / City"
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={deliveryPincode}
                      onChange={(e) => setDeliveryPincode(e.target.value)}
                      placeholder="PIN Code"
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Payment Option
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery (COD)' },
                      { id: 'UPI_QR', label: 'Direct UPI QR' },
                      { id: 'RAZORPAY', label: 'Razorpay Online' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setOrderPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          orderPaymentMethod === m.id
                            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {orderError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                    {orderError}
                  </div>
                )}

                {/* Pricing & Confirmation */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</div>
                    <div className="text-xl font-heading font-black text-slate-900 dark:text-white font-mono">
                      ₹{orderingProduct.price * orderQuantity}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmDirectOrder}
                    disabled={isPlacingOrder}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-heading font-extrabold shadow-md transition-all disabled:opacity-50"
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Placing Direct Order...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm Order (No Shop Visit Required)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
