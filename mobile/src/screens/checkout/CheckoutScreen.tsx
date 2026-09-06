import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  QrCode,
  CreditCard,
  Banknote,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ordersApi } from '../../services/api';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';

export const CheckoutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, subtotal, total, fetchCart } = useCart();

  // Delivery Address Form
  const [fullName, setFullName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [street, setStreet] = useState<string>(user?.address?.street || '');
  const [city, setCity] = useState<string>(user?.address?.city || 'Anantapur');
  const [state, setState] = useState<string>(user?.address?.state || 'Andhra Pradesh');
  const [pincode, setPincode] = useState<string>(user?.address?.pincode || '515001');

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<'UPI_QR' | 'RAZORPAY' | 'CASH_ON_DELIVERY'>('UPI_QR');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Checkout</Text>
          <View style={{ width: 38 }} />
        </View>
        <EmptyState
          title="Your Cart is Empty"
          description="Please add items to your cart before proceeding to checkout."
          actionTitle="Go to Marketplace"
          onAction={() => navigation.navigate('MarketplaceTab')}
        />
      </View>
    );
  }

  const handlePlaceOrder = async () => {
    setErrorMsg(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMsg('Please enter the recipient full name');
      return;
    }
    if (!phone.trim() || phone.trim().length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!street.trim()) {
      setErrorMsg('Please enter your street address / market yard location');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter city / district');
      return;
    }
    if (!state.trim()) {
      setErrorMsg('Please enter state');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal pincode');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ordersApi.createOrder({
        deliveryAddress: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        paymentMethod,
      });

      if (res.success && res.order) {
        // Refresh local cart state
        await fetchCart();

        const orderId = res.order._id || res.order.id || '';
        const orderNumber = res.order.orderNumber;
        const totalAmount = res.order.totalAmount;

        // Navigate to payment screen
        navigation.replace('Payment', {
          orderId,
          orderNumber,
          totalAmount,
        });
      } else {
        throw new Error(res.message || 'Order creation failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to place order.';
      setErrorMsg(msg);
      Alert.alert('Checkout Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Checkout & Order</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Order Items Snapshot Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Summary ({items.length} items)</Text>
            {items.map((item) => {
              const productId = item.product.id || item.product._id || '';
              return (
                <View key={productId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.quantity} × ₹{item.currentPrice.toFixed(2)} / {item.product.unit || 'unit'}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>₹{item.subtotal.toFixed(2)}</Text>
                </View>
              );
            })}

            <View style={styles.cardDivider} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceVal}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Partner Fee</Text>
              <Text style={[styles.priceVal, styles.freeText]}>FREE (Kisan Seva)</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Grand Total (Payable)</Text>
              <Text style={styles.totalVal}>₹{total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Delivery Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderWithIcon}>
              <MapPin size={20} color="#047857" />
              <Text style={styles.cardTitle}>Farm Delivery Address</Text>
            </View>
            <Text style={styles.cardSubtitle}>Direct dispatch to your local farm / village</Text>

            <Input
              label="Recipient Full Name *"
              placeholder="e.g. Ramesh Reddy"
              value={fullName}
              onChangeText={setFullName}
            />

            <Input
              label="Mobile Number (for delivery coordination) *"
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            <Input
              label="Street / Landmark / Market Yard *"
              placeholder="e.g. Gooty Road, Kamalanagar"
              value={street}
              onChangeText={setStreet}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Input
                  label="City / District *"
                  placeholder="Anantapur"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Input
                  label="Pincode *"
                  placeholder="515001"
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>

            <Input
              label="State *"
              placeholder="Andhra Pradesh"
              value={state}
              onChangeText={setState}
            />
          </View>

          {/* Payment Method Selector Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Payment Method</Text>
            <Text style={styles.cardSubtitle}>Authoritative server-validated transaction</Text>

            {/* Option 1: Direct Store Partner UPI QR */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'UPI_QR' && styles.selectedMethodCard,
              ]}
              onPress={() => setPaymentMethod('UPI_QR')}
              activeOpacity={0.8}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, paymentMethod === 'UPI_QR' && styles.selectedMethodIcon]}>
                  <QrCode size={22} color={paymentMethod === 'UPI_QR' ? '#ffffff' : '#047857'} />
                </View>
                <View style={styles.methodInfo}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>Direct Store Partner UPI QR</Text>
                    <View style={styles.recBadge}>
                      <Text style={styles.recBadgeText}>Instant</Text>
                    </View>
                  </View>
                  <Text style={styles.methodDesc}>
                    Pay directly to verified Store Partner bank account via GPay, PhonePe, Paytm, BHIM.
                  </Text>
                </View>
              </View>
              {paymentMethod === 'UPI_QR' ? (
                <CheckCircle2 size={20} color="#047857" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            {/* Option 2: Razorpay Online */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'RAZORPAY' && styles.selectedMethodCard,
              ]}
              onPress={() => setPaymentMethod('RAZORPAY')}
              activeOpacity={0.8}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, paymentMethod === 'RAZORPAY' && styles.selectedMethodIcon]}>
                  <CreditCard size={22} color={paymentMethod === 'RAZORPAY' ? '#ffffff' : '#0284c7'} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Razorpay Online Gateway</Text>
                  <Text style={styles.methodDesc}>
                    Credit/Debit Cards, Netbanking, Online Wallets.
                  </Text>
                </View>
              </View>
              {paymentMethod === 'RAZORPAY' ? (
                <CheckCircle2 size={20} color="#047857" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            {/* Option 3: Cash on Delivery */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'CASH_ON_DELIVERY' && styles.selectedMethodCard,
              ]}
              onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
              activeOpacity={0.8}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIcon, paymentMethod === 'CASH_ON_DELIVERY' && styles.selectedMethodIcon]}>
                  <Banknote size={22} color={paymentMethod === 'CASH_ON_DELIVERY' ? '#ffffff' : '#d97706'} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Cash on Delivery (COD)</Text>
                  <Text style={styles.methodDesc}>
                    Pay cash directly to verified delivery partner upon physical arrival.
                  </Text>
                </View>
              </View>
              {paymentMethod === 'CASH_ON_DELIVERY' ? (
                <CheckCircle2 size={20} color="#047857" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>
          </View>

          {/* Security & Verification Banner */}
          <View style={styles.securityBanner}>
            <ShieldCheck size={20} color="#047857" />
            <Text style={styles.securityBannerText}>
              Prices, stock validation, and totals are computed server-side directly from MongoDB.
            </Text>
          </View>

          {errorMsg ? <Text style={styles.formError}>{errorMsg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Total Payable</Text>
          <Text style={styles.footerTotal}>₹{total.toFixed(2)}</Text>
        </View>

        <Button
          title={isSubmitting ? 'Placing Order...' : 'Place Order & Pay'}
          onPress={handlePlaceOrder}
          loading={isSubmitting}
          size="large"
          style={styles.payBtn}
          icon={<Lock size={16} color="#ffffff" />}
        />
      </View>
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
  keyboardWrap: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  freeText: {
    color: '#047857',
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  selectedMethodCard: {
    borderColor: '#047857',
    backgroundColor: '#f0fdf4',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedMethodIcon: {
    backgroundColor: '#047857',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  recBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  methodDesc: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 15,
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  securityBannerText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
  },
  formError: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  footerCol: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
  },
  payBtn: {
    flex: 1.4,
  },
});
