import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sun,
  Crosshair,
  Focus,
  Leaf,
  Clock,
  ChevronRight,
  ShieldCheck,
  SwitchCamera,
  Settings,
} from 'lucide-react-native';
import { cropHealthApi } from '../../services/api';
import { CropAnalysis } from '../../types/cropHealth';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const LeafScannerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);

  // Selected image state for analysis
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera permissions & runtime lifecycle state
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Past scan history state
  const [history, setHistory] = useState<CropAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await cropHealthApi.getHistory();
      if (res.success && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch {
      // Non-fatal for history
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRequestPermission = async () => {
    setMountError(null);
    try {
      const result = await requestPermission();
      if (!result.granted) {
        if (!result.canAskAgain) {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission was previously denied. Please enable camera access in your device settings to use the live leaf scanner.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      }
    } catch (err: any) {
      setMountError(`Permission request failed: ${err.message || err}`);
    }
  };

  const handleToggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;

    setErrorMessage(null);
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setSelectedImageUri(photo.uri);
        setSelectedFileName(`leaf_capture_${Date.now()}.jpg`);
      } else {
        throw new Error('No photo data received from camera sensor.');
      }
    } catch (err: any) {
      console.error('Camera capture error:', err);
      Alert.alert(
        'Photo Capture Failed',
        err.message || 'Could not capture photo from camera sensor. You can also pick an existing photo from the gallery.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    setErrorMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setSelectedFileName(asset.fileName || `leaf_gallery_${Date.now()}.jpg`);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', 'Could not access device image gallery.');
    }
  };

  const handleRetake = () => {
    setSelectedImageUri(null);
    setSelectedFileName(null);
    setErrorMessage(null);
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImageUri) {
      Alert.alert('No Image', 'Please capture or select a leaf image first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await cropHealthApi.analyzeImage(
        selectedImageUri,
        selectedFileName || `leaf_scan_${Date.now()}.jpg`,
        'image/jpeg'
      );

      if (res.success && res.analysis) {
        // Refresh past scans in background
        loadHistory();
        // Navigate to dedicated result screen
        navigation.navigate('ScannerResult', {
          analysis: res.analysis,
          imageUri: selectedImageUri,
        });
      } else {
        throw new Error(res.message || 'Pathology analysis could not be completed.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.code;
      const apiMessage = err.response?.data?.message || err.message;

      if (errorCode === 'AI_SERVICE_NOT_CONFIGURED') {
        setErrorMessage('AI SERVICE NOT CONFIGURED: Plant disease AI model is not configured on the server.');
      } else if (errorCode === 'AI_SERVICE_UNAVAILABLE' || status === 503 || status === 502 || err.code === 'ECONNREFUSED') {
        setErrorMessage('AI service is currently unavailable. Please ensure the backend AI service is online.');
      } else if (errorCode === 'IMAGE_INVALID' || status === 400) {
        setErrorMessage(apiMessage || 'Invalid image format or size. Please upload a valid JPEG/PNG leaf photo.');
      } else if (errorCode === 'PREDICTION_FAILED') {
        setErrorMessage(apiMessage || 'AI model could not process the leaf features. Please capture a clearer photo.');
      } else if (apiMessage) {
        setErrorMessage(apiMessage);
      } else {
        setErrorMessage('Image upload or AI communication failed. Please check your network connection.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.titleWrapper}>
          <Text style={styles.topBarTitle}>AI Leaf Disease Scanner</Text>
          <Text style={styles.topBarSubtitle}>Pathology Diagnosis & Remedies</Text>
        </View>
        <TouchableOpacity onPress={loadHistory} style={styles.iconBtn}>
          <RefreshCw size={18} color="#047857" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color="#b91c1c" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>AI Diagnosis Unavailable</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
            </View>
            <TouchableOpacity onPress={() => setErrorMessage(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Viewfinder / Camera Section */}
        <View style={styles.cameraBox}>
          {selectedImageUri ? (
            /* Image Preview Mode */
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewOverlay}>
                <View style={styles.previewBadge}>
                  <Leaf size={14} color="#047857" />
                  <Text style={styles.previewBadgeText}>Ready for AI Analysis</Text>
                </View>
              </View>
            </View>
          ) : permission?.granted && isFocused ? (
            /* Live Real Native CameraView */
            <View style={styles.liveCameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.cameraView}
                facing={facing}
                mode="picture"
                onCameraReady={() => {
                  setIsCameraReady(true);
                  setMountError(null);
                }}
                onMountError={(error) => {
                  console.error('CameraView mount error:', error);
                  setMountError(error.message || 'Camera failed to initialize on device.');
                }}
              >
                {/* Live Viewfinder Frame Overlay */}
                <View style={styles.viewfinderOverlay}>
                  <View style={styles.viewfinderTarget}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                    <View style={styles.targetCenter}>
                      <Leaf size={24} color="rgba(255, 255, 255, 0.6)" />
                    </View>
                  </View>

                  {/* Top Bar Controls Inside Camera */}
                  <View style={styles.cameraControlsOverlay}>
                    <TouchableOpacity
                      style={styles.cameraActionBtn}
                      onPress={handleToggleFacing}
                      activeOpacity={0.7}
                    >
                      <SwitchCamera size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>

              {mountError && (
                <View style={styles.mountErrorBox}>
                  <AlertCircle size={16} color="#b91c1c" />
                  <Text style={styles.mountErrorText}>{mountError}</Text>
                </View>
              )}
            </View>
          ) : (
            /* Permission Request or Fallback Placeholder */
            <View style={styles.emptyViewfinder}>
              <View style={styles.scannerCrosshair}>
                <Camera size={38} color="#047857" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>Camera Access Required</Text>
              <Text style={styles.emptyDesc}>
                Allow camera permission to scan crop leaves in real-time and diagnose plant pathology.
              </Text>
              <View style={styles.permissionActionRow}>
                <TouchableOpacity
                  style={styles.grantPermBtn}
                  onPress={handleRequestPermission}
                  activeOpacity={0.8}
                >
                  <Camera size={16} color="#ffffff" />
                  <Text style={styles.grantPermBtnText}>Enable Camera</Text>
                </TouchableOpacity>
                {!permission?.canAskAgain && (
                  <TouchableOpacity
                    style={styles.settingsBtn}
                    onPress={() => Linking.openSettings()}
                    activeOpacity={0.8}
                  >
                    <Settings size={16} color="#047857" />
                    <Text style={styles.settingsBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons underneath camera viewfinder */}
          {selectedImageUri ? (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={handleRetake}
                disabled={isAnalyzing}
              >
                <RefreshCw size={16} color="#374151" />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled]}
                onPress={handleAnalyzeImage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.analyzeBtnText}>Analyzing Pathology...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} color="#ffffff" />
                    <Text style={styles.analyzeBtnText}>Analyze Crop Leaf</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.captureButtonsRow}>
              {permission?.granted && isFocused ? (
                <TouchableOpacity
                  style={[styles.capturePrimaryBtn, (isCapturing || !isCameraReady) && styles.btnDisabled]}
                  onPress={handleCapturePhoto}
                  disabled={isCapturing || !isCameraReady}
                  activeOpacity={0.8}
                >
                  {isCapturing ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.capturePrimaryText}>Capturing...</Text>
                    </>
                  ) : (
                    <>
                      <Camera size={20} color="#ffffff" />
                      <Text style={styles.capturePrimaryText}>Capture Leaf Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.captureSecondaryBtn, !(permission?.granted && isFocused) && { flex: 1 }]}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <ImageIcon size={20} color="#047857" />
                <Text style={styles.captureSecondaryText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quality Guidelines Card */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <ShieldCheck size={18} color="#047857" />
            <Text style={styles.guideHeaderTitle}>Tips for Accurate Diagnosis</Text>
          </View>

          <View style={styles.tipsGrid}>
            <View style={styles.tipItem}>
              <View style={styles.tipIconBox}>
                <Sun size={16} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Natural Daylight</Text>
                <Text style={styles.tipDesc}>Ensure bright, natural illumination without harsh shadow.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIconBox}>
                <Focus size={16} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Sharp & In-Focus</Text>
                <Text style={styles.tipDesc}>Hold steady 15–25 cm away to capture clear leaf spots.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipIconBox}>
                <Leaf size={16} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Single Leaf Subject</Text>
                <Text style={styles.tipDesc}>Position one infected leaf in the frame; avoid busy background.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Diagnoses History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <View style={styles.historyTitleBox}>
              <Clock size={16} color="#374151" />
              <Text style={styles.historyTitle}>Recent Leaf Scans</Text>
            </View>
            {history.length > 0 && (
              <Text style={styles.historyCount}>{history.length} scans</Text>
            )}
          </View>

          {isLoadingHistory ? (
            <ActivityIndicator size="small" color="#047857" style={{ padding: 16 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No past crop diagnoses recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.slice(0, 5).map((item) => {
                const itemId = item.id || (item as any)._id;
                const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <TouchableOpacity
                    key={itemId}
                    style={styles.historyCard}
                    onPress={() =>
                      navigation.navigate('ScannerResult', {
                        analysis: item,
                        imageUri: item.imageData,
                      })
                    }
                  >
                    <View style={styles.historyIconBox}>
                      <Leaf
                        size={18}
                        color={item.isHealthy ? '#047857' : item.isConfident ? '#dc2626' : '#d97706'}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.historyCropName}>{item.crop}</Text>
                      <Text style={styles.historyDiseaseName} numberOfLines={1}>
                        {item.disease}
                      </Text>
                      <Text style={styles.historyDate}>{formattedDate}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Badge
                        label={
                          item.isHealthy
                            ? 'Healthy'
                            : item.isConfident
                            ? `${Math.round(item.confidence * 100)}%`
                            : 'Uncertain'
                        }
                        variant={item.isHealthy ? 'success' : item.isConfident ? 'danger' : 'warning'}
                      />
                      <ChevronRight size={16} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorDesc: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 2,
    lineHeight: 16,
  },
  errorDismiss: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    padding: 4,
  },
  cameraBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 18,
  },
  liveCameraContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#000000',
    position: 'relative',
  },
  cameraView: {
    width: '100%',
    height: '100%',
  },
  viewfinderOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  viewfinderTarget: {
    width: 220,
    height: 220,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10b981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  targetCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControlsOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cameraActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mountErrorBox: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mountErrorText: {
    fontSize: 11,
    color: '#b91c1c',
    flex: 1,
  },
  emptyViewfinder: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  scannerCrosshair: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064e3b',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  permissionActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  grantPermBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  grantPermBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#047857',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  settingsBtnText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#111827',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    gap: 6,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  analyzeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#047857',
    gap: 8,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  analyzeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  captureButtonsRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  capturePrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#047857',
    gap: 8,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  capturePrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  captureSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    gap: 8,
  },
  captureSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  guideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 18,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guideHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  tipsGrid: {
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  tipDesc: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 15,
  },
  historySection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  historyCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyHistory: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyCropName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  historyDiseaseName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  historyDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
