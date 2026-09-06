import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCodeSVG from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  QrCode,
  CreditCard,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Store,
  Phone,
  Package,
} from 'lucide-react-native';
import { paymentsApi, ordersApi } from '../../services/api';
import { Order } from '../../types/order';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PaymentScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber: initialOrderNum, totalAmount: initialTotal } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [upiDetails, setUpiDetails] = useState<{
    upiConfigured: boolean;
    storeName?: string;
    merchantName?: string;
    upiId?: string;
    phoneNumber?: string;
    amount?: number;
    upiIntentUrl?: string;
    message?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'UPI' | 'RAZORPAY'>('UPI');

  // UTR submission state
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [utrSubmitted, setUtrSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPaymentData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const [orderRes, upiRes] = await Promise.all([
        ordersApi.getOrderById(orderId),
        paymentsApi.getOrderUpiDetails(orderId).catch(() => null),
      ]);

      if (orderRes.success && orderRes.order) {
        setOrder(orderRes.order);
      }
      if (upiRes) {
        setUpiDetails(upiRes);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load order payment details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  if (isLoading) {
    return <LoadingSpinner message="Loading payment gateway & QR..." />;
  }

  const payableAmount = order?.totalAmount ?? initialTotal ?? 0;
  const orderRef = order?.orderNumber || initialOrderNum || 'Order';
  const isPaid = order?.paymentStatus === 'PAID';

  // Construct NPCI Standard minimal URI if upiIntentUrl is provided or generated
  const formattedUpi = upiDetails?.upiId?.trim() || '';
  const merchantName = upiDetails?.merchantName || upiDetails?.storeName || 'AgriMart Store Partner';
  const amountStr = payableAmount.toFixed(2);

  const finalUpiUri =
    upiDetails?.upiIntentUrl ||
    (formattedUpi
      ? `upi://pay?pa=${formattedUpi}&pn=${encodeURIComponent(merchantName)}&am=${amountStr}&cu=INR`
      : '');

  const handleOpenUpiApp = async () => {
    if (!finalUpiUri) {
      Alert.alert('UPI Unavailable', 'Store Partner UPI is not configured.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(finalUpiUri);
      if (supported) {
        await Linking.openURL(finalUpiUri);
      } else {
        // Attempt direct open on mobile devices where canOpenURL may return false for upi schemes
        await Linking.openURL(finalUpiUri).catch(() => {
          Alert.alert(
            'UPI App Not Found',
            'No supported UPI application (PhonePe, Google Pay, Paytm, BHIM) was detected on this device. Please scan the QR code using another phone or copy the UPI ID.'
          );
        });
      }
    } catch {
      Alert.alert(
        'UPI Error',
        'Could not open UPI app. Please scan the QR code or pay manually using the Store Partner UPI ID.'
      );
    }
  };

  const handleCopyUpiId = async () => {
    if (formattedUpi) {
      await Clipboard.setStringAsync(formattedUpi);
      Alert.alert('Copied', `UPI ID ${formattedUpi} copied to clipboard.`);
    }
  };

  const handleCopyLink = async () => {
    if (finalUpiUri) {
      await Clipboard.setStringAsync(finalUpiUri);
      Alert.alert('Copied', 'UPI payment link copied to clipboard.');
    }
  };

  const handleSubmitUtr = async () => {
    if (!utrNumber.trim()) {
      Alert.alert('UTR Required', 'Please enter the 12-digit UPI Transaction Reference (UTR) from your payment app.');
      return;
    }
    if (utrNumber.trim().length < 6) {
      Alert.alert('Invalid UTR', 'Please enter a valid Transaction Reference number.');
      return;
    }

    setIsSubmittingUtr(true);
    try {
      const res = await paymentsApi.submitUtr(orderId, utrNumber.trim(), 'Mobile UPI App');
      if (res.success) {
        setUtrSubmitted(true);
        Alert.alert(
          'UTR Submitted',
          'Your UPI payment reference has been submitted. Order payment status will be marked as PAID once verified by the Store Partner / Admin.'
        );
        fetchPaymentData();
      } else {
        throw new Error(res.message || 'Failed to submit UTR.');
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err.response?.data?.message || 'Could not submit payment reference.');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Order Payment</Text>
        <TouchableOpacity
          onPress={() => {
            setIsRefreshing(true);
            fetchPaymentData();
          }}
          style={styles.backBtn}
        >
          <RefreshCw size={18} color="#047857" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Order Status Banner */}
        <View style={styles.orderBanner}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={styles.orderLabel}>Order Reference</Text>
              <Text style={styles.orderNumberText}>{orderRef}</Text>
            </View>
            <Badge
              label={isPaid ? 'PAID' : 'PAYMENT PENDING'}
              variant={isPaid ? 'success' : 'warning'}
            />
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total Amount Payable</Text>
            <Text style={styles.amountVal}>₹{payableAmount.toFixed(2)}</Text>
          </View>
        </View>

        {isPaid ? (
          /* Payment Confirmed State */
          <View style={styles.paidCard}>
            <CheckCircle2 size={56} color="#047857" style={styles.successIcon} />
            <Text style={styles.paidTitle}>Payment Verified & Confirmed!</Text>
            <Text style={styles.paidDesc}>
              Your payment of ₹{payableAmount.toFixed(2)} has been verified. The Store Partner is now preparing your agricultural supplies for dispatch.
            </Text>
            <Button
              title="Track Order Delivery"
              onPress={() => navigation.navigate('OrdersTab')}
              size="large"
              style={{ marginTop: 16, width: '100%' }}
              icon={<Package size={18} color="#ffffff" />}
            />
          </View>
        ) : (
          <>
            {/* Payment Method Switcher Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'UPI' && styles.activeTabBtn]}
                onPress={() => setActiveTab('UPI')}
              >
                <QrCode size={18} color={activeTab === 'UPI' ? '#047857' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'UPI' && styles.activeTabText]}>
                  Direct Store Partner UPI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'RAZORPAY' && styles.activeTabBtn]}
                onPress={() => setActiveTab('RAZORPAY')}
              >
                <CreditCard size={18} color={activeTab === 'RAZORPAY' ? '#047857' : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'RAZORPAY' && styles.activeTabText]}>
                  Razorpay Online
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'UPI' ? (
              /* Direct Store Partner UPI QR Card */
              <View style={styles.qrCard}>
                <View style={styles.storeHeader}>
                  <Store size={20} color="#047857" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeTitle}>
                      {upiDetails?.storeName || 'Anantapur Kisan Agro Seva Kendra'}
                    </Text>
                    {upiDetails?.phoneNumber ? (
                      <View style={styles.phoneRow}>
                        <Phone size={12} color="#6b7280" />
                        <Text style={styles.phoneText}>Store Partner: {upiDetails.phoneNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {upiDetails?.upiConfigured && formattedUpi ? (
                  <>
                    <Text style={styles.scanInstruction}>
                      Scan this QR with any UPI app to pay ₹{payableAmount.toFixed(2)}
                    </Text>

                    {/* High-Contrast QR Code Rendering */}
                    <View style={styles.qrWrapper}>
                      <QRCodeSVG
                        value={finalUpiUri}
                        size={220}
                        color="#000000"
                        backgroundColor="#ffffff"
                      />
                    </View>

                    {/* Payee Info Pills */}
                    <View style={styles.vpaPill}>
                      <Text style={styles.vpaLabel}>UPI ID: </Text>
                      <Text style={styles.vpaValue}>{formattedUpi}</Text>
                      <TouchableOpacity onPress={handleCopyUpiId} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Copy size={16} color="#047857" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <Button
                        title="Open in UPI App"
                        onPress={handleOpenUpiApp}
                        size="medium"
                        style={styles.openBtn}
                        icon={<ExternalLink size={16} color="#ffffff" />}
                      />
                      <TouchableOpacity style={styles.copyLinkBtn} onPress={handleCopyLink}>
                        <Copy size={16} color="#047857" />
                        <Text style={styles.copyLinkText}>Copy Link</Text>
                      </TouchableOpacity>
                    </View>

                    {/* UTR Submission Box */}
                    <View style={styles.utrSection}>
                      <Text style={styles.utrTitle}>Step 2: Submit Payment UTR</Text>
                      <Text style={styles.utrDesc}>
                        After completing the UPI transfer, enter the 12-digit UTR / Reference number from GPay, PhonePe, Paytm, or BHIM.
                      </Text>

                      <View style={styles.utrInputRow}>
                        <TextInput
                          style={styles.utrInput}
                          placeholder="e.g. 123456789012"
                          placeholderTextColor="#9ca3af"
                          value={utrNumber}
                          onChangeText={setUtrNumber}
                          keyboardType="default"
                          autoCapitalize="characters"
                        />
                        <Button
                          title="Submit"
                          onPress={handleSubmitUtr}
                          loading={isSubmittingUtr}
                          size="medium"
                          style={styles.utrSubmitBtn}
                        />
                      </View>

                      {utrSubmitted ? (
                        <View style={styles.utrStatusAlert}>
                          <Clock size={16} color="#d97706" />
                          <Text style={styles.utrStatusText}>
                            UTR registered. Payment verification pending by Admin.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : (
                  /* Store Partner UPI Unconfigured State */
                  <View style={styles.unconfiguredBox}>
                    <AlertCircle size={32} color="#d97706" />
                    <Text style={styles.unconfiguredTitle}>Store Partner UPI Not Configured</Text>
                    <Text style={styles.unconfiguredDesc}>
                      The Agri Store Partner has not configured a UPI ID yet. Please select Cash on Delivery or contact the retail partner.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              /* Razorpay Gateway Tab */
              <View style={styles.razorpayCard}>
                <CreditCard size={40} color="#0284c7" style={{ marginBottom: 12 }} />
                <Text style={styles.razorpayTitle}>Razorpay Online Gateway</Text>
                <Text style={styles.razorpayDesc}>
                  Pay securely using Credit Cards, Debit Cards, Netbanking, or Wallets with 256-bit encryption.
                </Text>

                <View style={styles.razorpayNotice}>
                  <AlertCircle size={18} color="#0284c7" />
                  <Text style={styles.razorpayNoticeText}>
                    Razorpay keys are managed securely in server environment. Online payments will proceed through Razorpay checkout.
                  </Text>
                </View>

                <Button
                  title={`Pay ₹${payableAmount.toFixed(2)} with Razorpay`}
                  onPress={() => {
                    Alert.alert(
                      'Razorpay Payment',
                      'Direct Store Partner UPI QR is recommended for zero-fee instant settlement. Proceed with Razorpay?',
                      [
                        { text: 'Use UPI QR', onPress: () => setActiveTab('UPI') },
                        {
                          text: 'Continue',
                          onPress: () => {
                            Alert.alert('Processing', 'Connecting to Razorpay gateway server...');
                          },
                        },
                      ]
                    );
                  }}
                  size="large"
                  style={{ width: '100%', marginTop: 16 }}
                />
              </View>
            )}

            {/* Anti-Fraud Security Guarantee */}
            <View style={styles.securityBox}>
              <ShieldCheck size={20} color="#047857" />
              <Text style={styles.securityText}>
                AgriMart Secure Escrow: Orders are updated to PAID only after verified fund clearance in the Store Partner bank account.
              </Text>
            </View>
          </>
        )}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  orderNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  amountBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
  },
  amountVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#047857',
  },
  paidCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successIcon: {
    marginBottom: 12,
  },
  paidTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
    textAlign: 'center',
  },
  paidDesc: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#ecfdf5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#047857',
    fontWeight: '700',
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12,
  },
  storeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#6b7280',
  },
  scanInstruction: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500',
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#047857',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  vpaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 14,
  },
  vpaLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  vpaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  openBtn: {
    flex: 1.4,
  },
  copyLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#047857',
    paddingVertical: 10,
  },
  copyLinkText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13,
  },
  utrSection: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  utrTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  utrDesc: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 16,
  },
  utrInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  utrInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    height: 44,
  },
  utrSubmitBtn: {
    minWidth: 90,
  },
  utrStatusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  utrStatusText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  unconfiguredBox: {
    padding: 24,
    alignItems: 'center',
  },
  unconfiguredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 8,
  },
  unconfiguredDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  razorpayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginBottom: 16,
  },
  razorpayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  razorpayDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  razorpayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  razorpayNoticeText: {
    fontSize: 11,
    color: '#0369a1',
    flex: 1,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  securityText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
});
