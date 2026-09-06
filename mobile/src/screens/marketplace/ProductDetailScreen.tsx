import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  Store,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { productsApi } from '../../services/api';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const ProductDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { productId, product: initialProduct } = route.params;
  const { addToCart, totalItems } = useCart();

  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProduct);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await productsApi.getProductById(productId);
        if (res.success && res.product) {
          setProduct(res.product);
        }
      } catch {
        // Fallback to initial product
      } finally {
        setIsLoading(false);
      }
    };

    if (!initialProduct || !product?.description) {
      fetchDetails();
    }
  }, [productId, initialProduct]);

  if (isLoading || !product) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  const isOutOfStock = product.stock <= 0;
  const imageUri = product.images && product.images.length > 0 ? product.images[0] : null;
  const totalPrice = product.price * quantity;

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    setIsAdding(true);
    try {
      await addToCart(product.id || product._id || '', quantity);
      Alert.alert('Added to Cart', `${quantity} ${product.unit || 'unit'} of ${product.name} added to your cart.`, [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('CartTab') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add item to cart.');
    } finally {
      setIsAdding(false);
    }
  };

  const shopName =
    typeof product.shopOwner === 'object' && product.shopOwner?.shopName
      ? product.shopOwner.shopName
      : typeof product.shopOwner === 'object' && product.shopOwner?.name
      ? product.shopOwner.name
      : 'AgriMart Retail Hub';

  return (
    <View style={styles.container}>
      {/* Custom Top Navigation Bar */}
      <View style={[styles.navBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CartTab')}>
          <ShoppingBag size={22} color="#111827" />
          {totalItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderEmoji}>🌾</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{product.brand || 'Verified Agricultural Brand'}</Text>
            <Badge
              label={isOutOfStock ? 'Out of Stock' : `${product.stock} in Stock`}
              variant={isOutOfStock ? 'danger' : 'success'}
            />
          </View>

          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.category}>{product.category}</Text>

          {/* Pricing Row */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Price</Text>
              <View style={styles.priceValueRow}>
                <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
                <Text style={styles.unit}> / {product.unit || 'unit'}</Text>
              </View>
            </View>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} color={quantity <= 1 ? '#9ca3af' : '#047857'} />
                </TouchableOpacity>
                <Text style={styles.qtyNumber}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  <Plus size={16} color={quantity >= product.stock ? '#9ca3af' : '#047857'} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Description & Crop Guidelines</Text>
            <Text style={styles.description}>
              {product.description ||
                'High-performance genuine agricultural supply curated for Indian farming conditions and optimal harvest yield.'}
            </Text>
          </View>

          {/* Store Partner & Location */}
          <View style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <Store size={20} color="#047857" />
              <Text style={styles.storeName}>{shopName}</Text>
            </View>
            <View style={styles.storeLocation}>
              <MapPin size={16} color="#6b7280" />
              <Text style={styles.locationText}>
                {product.location?.city || 'Anantapur'}, {product.location?.state || 'Andhra Pradesh'} (
                {product.location?.pincode || '515001'})
              </Text>
            </View>
            <View style={styles.storeVerified}>
              <ShieldCheck size={16} color="#047857" />
              <Text style={styles.verifiedText}>AgriMart Authorized Direct Fulfillment Partner</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalAmount}>₹{totalPrice.toFixed(2)}</Text>
        </View>

        <Button
          title={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          loading={isAdding}
          size="large"
          style={styles.addCartBtn}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#047857',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    height: 260,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
  },
  placeholderEmoji: {
    fontSize: 72,
  },
  infoCard: {
    padding: 20,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 28,
  },
  category: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#047857',
  },
  unit: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  storeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
  },
  storeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  bottomBar: {
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
  totalBlock: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
  },
  addCartBtn: {
    flex: 1.2,
  },
});
