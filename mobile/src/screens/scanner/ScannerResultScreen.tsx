import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Camera,
  Share2,
  ShieldCheck,
  Stethoscope,
  Info,
  Leaf,
  Check,
  HelpCircle,
} from 'lucide-react-native';
import { CropAnalysis } from '../../types/cropHealth';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ScannerResultScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { analysis, imageUri }: { analysis: CropAnalysis; imageUri?: string } = route.params;

  const isHealthy = analysis.isHealthy;
  const isConfident = analysis.isConfident && analysis.confidence >= 0.35;
  const confidencePercent = Math.round((analysis.confidence || 0) * 100);

  const handleShare = async () => {
    try {
      await Share.share({
        title: `AgroMitra AI Crop Report: ${analysis.crop} - ${analysis.disease}`,
        message: `🌱 AgroMitra AI Pathology Report:\nCrop: ${analysis.crop}\nCondition: ${analysis.disease}\nStatus: ${
          isHealthy ? 'Healthy' : 'Affected'
        }\nConfidence: ${confidencePercent}%\n\nRemedies:\n${(analysis.recommendedActions || []).join(
          '\n'
        )}\n\nDiagnosed via AgroMitra Native Leaf Scanner.`,
      });
    } catch {
      // Ignore share cancel
    }
  };

  const handleFindRemedies = () => {
    // Navigate to marketplace to browse bio-fungicides / crop protection
    navigation.navigate('MainTabs', {
      screen: 'MarketplaceTab',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Diagnosis Report</Text>
        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
          <Share2 size={18} color="#047857" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Scanned Image Card */}
        {imageUri ? (
          <View style={styles.imageCard}>
            <Image source={{ uri: imageUri }} style={styles.scannedImage} resizeMode="cover" />
            <View style={styles.imageOverlayBadge}>
              <Badge
                label={
                  isHealthy
                    ? 'HEALTHY CROP'
                    : isConfident
                    ? 'DISEASE DETECTED'
                    : 'UNCERTAIN'
                }
                variant={isHealthy ? 'success' : isConfident ? 'danger' : 'warning'}
              />
            </View>
          </View>
        ) : null}

        {/* Low Confidence Warning Alert */}
        {!isConfident && (
          <View style={styles.lowConfidenceBox}>
            <AlertTriangle size={22} color="#b45309" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lowConfidenceTitle}>
                Unable to confidently identify the disease.
              </Text>
              <Text style={styles.lowConfidenceDesc}>
                The AI model detected low classification confidence ({confidencePercent}%). The image might be blurry, poorly lit, or lack distinct leaf features.
              </Text>
              <Text style={styles.lowConfidenceAction}>
                Recommendation: Capture a clearer image of the leaf.
              </Text>
              <TouchableOpacity
                style={styles.retakeWarningBtn}
                onPress={() => navigation.goBack()}
              >
                <Camera size={16} color="#ffffff" />
                <Text style={styles.retakeWarningText}>Take Another Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Primary Diagnosis Summary Card */}
        <View style={styles.diagnosisCard}>
          <View style={styles.diagnosisHeader}>
            <View style={styles.cropTag}>
              <Leaf size={14} color="#047857" />
              <Text style={styles.cropTagText}>{analysis.crop || 'Agricultural Crop'}</Text>
            </View>

            <View style={styles.confidencePill}>
              <Sparkles size={12} color="#047857" />
              <Text style={styles.confidenceText}>{confidencePercent}% AI Confidence</Text>
            </View>
          </View>

          <Text style={styles.diseaseName}>{analysis.disease}</Text>

          <View style={styles.statusRow}>
            {isHealthy ? (
              <View style={styles.statusPillHealthy}>
                <CheckCircle2 size={16} color="#047857" />
                <Text style={styles.statusPillHealthyText}>Foliage Appears Healthy</Text>
              </View>
            ) : (
              <View style={isConfident ? styles.statusPillDiseased : styles.statusPillUncertain}>
                <AlertCircle size={16} color={isConfident ? '#dc2626' : '#d97706'} />
                <Text style={isConfident ? styles.statusPillDiseasedText : styles.statusPillUncertainText}>
                  {isConfident ? 'Treatment Recommended' : 'Low Confidence Detection'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Symptoms Section */}
        {analysis.symptoms && analysis.symptoms.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Stethoscope size={18} color="#047857" />
              <Text style={styles.sectionTitle}>Pathology & Symptoms</Text>
            </View>
            <View style={styles.bulletList}>
              {analysis.symptoms.map((symptom, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommended Actions / Treatment Section */}
        {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <CheckCircle2 size={18} color="#047857" />
              <Text style={styles.sectionTitle}>
                {isHealthy ? 'Maintenance Best Practices' : 'Recommended Treatments & Remedies'}
              </Text>
            </View>
            <View style={styles.bulletList}>
              {analysis.recommendedActions.map((action, idx) => (
                <View key={idx} style={styles.actionItem}>
                  <View style={styles.actionNumberBox}>
                    <Text style={styles.actionNumber}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Marketplace remedies CTA if disease detected */}
        {!isHealthy && isConfident && (
          <TouchableOpacity style={styles.marketCtaCard} onPress={handleFindRemedies}>
            <View style={styles.marketCtaIcon}>
              <ShoppingBag size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.marketCtaTitle}>Find Certified Crop Protection</Text>
              <Text style={styles.marketCtaDesc}>
                Browse fungicides, bio-sprays & micronutrients in the AgriMart Marketplace.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Medical / Agronomic Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Info size={16} color="#6b7280" style={{ marginTop: 1 }} />
          <Text style={styles.disclaimerText}>
            {analysis.disclaimer ||
              'AI crop diagnosis is for informational and educational guidance. Always verify with your local Agriculture Extension Officer (AEO) before applying restricted chemicals.'}
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={styles.scanAnotherBtn}
            onPress={() => navigation.goBack()}
          >
            <Camera size={18} color="#047857" />
            <Text style={styles.scanAnotherText}>Scan Another Leaf</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          >
            <Text style={styles.homeBtnText}>Return to Home</Text>
          </TouchableOpacity>
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageCard: {
    position: 'relative',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#111827',
  },
  scannedImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  lowConfidenceBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  lowConfidenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  lowConfidenceDesc: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 3,
    lineHeight: 16,
  },
  lowConfidenceAction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350f',
    marginTop: 4,
  },
  retakeWarningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d97706',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
    marginTop: 10,
  },
  retakeWarningText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  diagnosisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  diagnosisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cropTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  cropTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
    lineHeight: 26,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusPillHealthy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  statusPillHealthyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  statusPillDiseased: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  statusPillDiseasedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
  },
  statusPillUncertain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  statusPillUncertainText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  bulletList: {
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#047857',
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  actionNumberBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  actionText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  marketCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  marketCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketCtaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  marketCtaDesc: {
    fontSize: 11,
    color: '#a7f3d0',
    marginTop: 2,
    lineHeight: 15,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scanAnotherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    gap: 8,
  },
  scanAnotherText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  homeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
});
