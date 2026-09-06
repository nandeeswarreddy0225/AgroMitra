import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { CartItemRow } from '../../components/cart/CartItemRow';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { items, total, subtotal, isLoading, updateQuantity, removeFromCart, clearCart } = useCart();

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header title="Shopping Cart" showCart={false} />
        <EmptyState
          title="Sign in to View Cart"
          description="Log in with your farmer account to manage your selected seeds and supplies."
          icon={<ShoppingBag size={48} color="#047857" />}
          actionTitle="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Shopping Cart" showCart={false} />
        <LoadingSpinner message="Fetching your cart..." />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Shopping Cart" showCart={false} />
        <EmptyState
          title="Your Cart is Empty"
          description="Browse our agricultural marketplace to add certified seeds, bio-fertilizers, and farm supplies."
          icon={<ShoppingBag size={48} color="#9ca3af" />}
          actionTitle="Browse Marketplace"
          onAction={() => navigation.navigate('MarketplaceTab')}
        />
      </View>
    );
  }

  const handleCheckout = () => {
    navigation.navigate('Checkout');
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Shopping Cart"
        subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'} in cart`}
        showCart={false}
        rightAction={
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Cart Item Rows */}
        {items.map((item) => {
          const productId = item.product.id || item.product._id || '';
          return (
            <CartItemRow
              key={productId}
              item={item}
              onIncrease={() => updateQuantity(productId, item.quantity + 1)}
              onDecrease={() => updateQuantity(productId, item.quantity - 1)}
              onRemove={() => removeFromCart(productId)}
            />
          );
        })}

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Price Breakdown</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, styles.freeDelivery]}>FREE (Farmer Partner)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBox}>
          <ShieldCheck size={18} color="#047857" />
          <Text style={styles.securityText}>
            Protected by AgriMart Direct Verification & Secure UPI Payment Gateway
          </Text>
        </View>
      </ScrollView>

      {/* Checkout Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>Total Amount</Text>
          <Text style={styles.footerAmount}>₹{total.toFixed(2)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={handleCheckout}
          size="large"
          style={styles.checkoutBtn}
          icon={<ArrowRight size={18} color="#ffffff" />}
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
  clearBtn: {
    padding: 8,
    marginRight: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  freeDelivery: {
    color: '#047857',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  securityText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
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
  footerTotal: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  footerAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
  },
  checkoutBtn: {
    flex: 1.4,
  },
});
