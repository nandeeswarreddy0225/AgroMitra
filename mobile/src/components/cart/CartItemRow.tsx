import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Plus, Minus, Trash2 } from 'lucide-react-native';
import { CartItem } from '../../types/cart';

interface CartItemRowProps {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const { product, quantity, subtotal, currentPrice } = item;
  const imageUri = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>🌾</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.headerRow}>
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand || 'AgriMart'}
          </Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={styles.price}>
          ₹{currentPrice.toFixed(2)}
          <Text style={styles.unit}> / {product.unit || 'unit'}</Text>
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={onDecrease}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Minus size={14} color="#047857" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={onIncrease}
              disabled={quantity >= product.stock}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Plus size={14} color={quantity >= product.stock ? '#9ca3af' : '#047857'} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtotal}>₹{subtotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
  },
  placeholderText: {
    fontSize: 28,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 2,
  },
  unit: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '400',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
    paddingHorizontal: 8,
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#047857',
  },
});
