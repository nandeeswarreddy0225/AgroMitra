import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Sprout,
  Scan,
  FileText,
  TrendingUp,
  CloudSun,
  Package,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { productsApi } from '../../services/api';
import { Product } from '../../types/product';
import { Header } from '../../components/common/Header';
import { ProductCard } from '../../components/product/ProductCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const FarmerHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadHomeData = useCallback(async () => {
    try {
      const res = await productsApi.getProducts({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' });
      if (res.success && res.products) {
        setFeaturedProducts(res.products);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product.id || product._id || '', 1);
      Alert.alert('Added to Cart', `${product.name} added to your cart.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not add to cart.');
    }
  };

  const quickActions = [
    {
      id: 'market',
      title: 'Marketplace',
      subtitle: 'Seeds, Fertilizers',
      icon: <Sprout size={24} color="#047857" />,
      bg: '#ecfdf5',
      onPress: () => navigation.navigate('MarketplaceTab'),
    },
    {
      id: 'scanner',
      title: 'AI Scanner',
      subtitle: 'Leaf Disease AI',
      icon: <Scan size={24} color="#0284c7" />,
      bg: '#f0f9ff',
      onPress: () => navigation.navigate('LeafScanner'),
    },
    {
      id: 'schemes',
      title: 'Govt Schemes',
      subtitle: 'PM-Kisan, Subsidies',
      icon: <FileText size={24} color="#d97706" />,
      bg: '#fffbeb',
      onPress: () => Alert.alert('Government Schemes', 'Explore verified central and state farmer subsidy schemes.'),
    },
    {
      id: 'prices',
      title: 'Mandi Rates',
      subtitle: 'Daily Live Prices',
      icon: <TrendingUp size={24} color="#7c3aed" />,
      bg: '#f5f3ff',
      onPress: () => Alert.alert('Mandi Market Rates', 'Daily updated agricultural market yard commodity rates.'),
    },
    {
      id: 'weather',
      title: 'Weather & Agromet',
      subtitle: 'Local Forecast',
      icon: <CloudSun size={24} color="#ea580c" />,
      bg: '#fff7ed',
      onPress: () => Alert.alert('Weather Advisory', 'Real-time hyper-local agrometeorological advisory.'),
    },
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'Track Deliveries',
      icon: <Package size={24} color="#059669" />,
      bg: '#f0fdf4',
      onPress: () => navigation.navigate('OrdersTab'),
    },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="AgriMart"
        subtitle={user?.name ? `Namaste, ${user.name}` : 'Direct Agricultural Marketplace'}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadHomeData();
            }}
            colors={['#047857']}
          />
        }
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerBadge}>
            <Sparkles size={14} color="#047857" />
            <Text style={styles.bannerBadgeText}>100% Certified Direct from Retail Hubs</Text>
          </View>
          <Text style={styles.bannerTitle}>Quality Farm Supplies at Fair Prices</Text>
          <Text style={styles.bannerSubtitle}>
            Order genuine seeds, bio-fertilizers & crop protection delivered to your farm.
          </Text>
          <TouchableOpacity
            style={styles.bannerBtn}
            onPress={() => navigation.navigate('MarketplaceTab')}
          >
            <Text style={styles.bannerBtnText}>Explore Marketplace</Text>
            <ArrowRight size={16} color="#047857" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Farmer Services</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickCard, { backgroundColor: action.bg }]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.quickIcon}>{action.icon}</View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trust Badges */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <ShieldCheck size={20} color="#047857" />
            <Text style={styles.trustText}>Verified Products</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Truck size={20} color="#047857" />
            <Text style={styles.trustText}>Direct Doorstep Delivery</Text>
          </View>
        </View>

        {/* Real Featured Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Catalog Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MarketplaceTab')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <LoadingSpinner fullScreen={false} message="Loading real products..." />
        ) : (
          <View style={styles.productGrid}>
            {featuredProducts.map((product) => (
              <View key={product.id || product._id} style={styles.productCol}>
                <ProductCard
                  product={product}
                  onPress={() =>
                    navigation.navigate('ProductDetail', {
                      productId: product.id || product._id || '',
                      product,
                    })
                  }
                  onAddToCart={() => handleAddToCart(product)}
                />
              </View>
            ))}
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    backgroundColor: '#022c22',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#064e3b',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#a7f3d0',
    lineHeight: 18,
    marginBottom: 16,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  bannerBtnText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  quickCard: {
    width: '30.33%',
    marginHorizontal: '1.5%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  quickSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  trustBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  productCol: {
    width: '50%',
  },
});
