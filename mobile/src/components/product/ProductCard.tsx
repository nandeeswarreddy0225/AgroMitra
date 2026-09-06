import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { Product } from '../../types/product';
import { Badge } from '../common/Badge';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock <= 0;
  const imageUri = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>🌾</Text>
          </View>
        )}
        <View style={styles.badgeContainer}>
          <Badge
            label={isOutOfStock ? 'Out of Stock' : `${product.stock} In Stock`}
            variant={isOutOfStock ? 'danger' : 'success'}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand || 'AgriMart Verified'}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {product.category}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
            <Text style={styles.unit}>/{product.unit || 'unit'}</Text>
          </View>

          {onAddToCart && !isOutOfStock ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ShoppingCart size={16} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 16,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 140,
    backgroundColor: '#f3f4f6',
    position: 'relative',
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
    fontSize: 48,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  details: {
    padding: 12,
  },
  brand: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    minHeight: 36,
  },
  category: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  unit: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 2,
  },
  addButton: {
    backgroundColor: '#047857',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
