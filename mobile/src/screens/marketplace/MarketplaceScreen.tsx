import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react-native';
import { productsApi } from '../../services/api';
import { Product, PRODUCT_CATEGORIES } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { Header } from '../../components/common/Header';
import { ProductCard } from '../../components/product/ProductCard';
import { CategoryChip } from '../../components/product/CategoryChip';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorMessage } from '../../components/common/ErrorMessage';

export const MarketplaceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'price'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: any = {
        sortBy,
        sortOrder,
        limit: 50,
      };
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await productsApi.getProducts(params);
      if (res.success && res.products) {
        setProducts(res.products);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load products. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product.id || product._id || '', 1);
      Alert.alert('Cart Updated', `${product.name} added to cart.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not add product to cart.');
    }
  };

  const sortOptions = [
    { label: 'Newest Arrivals', sortBy: 'createdAt' as const, sortOrder: 'desc' as const },
    { label: 'Price: Low → High', sortBy: 'price' as const, sortOrder: 'asc' as const },
    { label: 'Price: High → Low', sortBy: 'price' as const, sortOrder: 'desc' as const },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder)?.label ||
    'Sort';

  return (
    <View style={styles.container}>
      <Header title="Agricultural Marketplace" subtitle="Verified Seeds, Fertilizers & Protection" />

      {/* Search Bar & Sort Toggle */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color="#047857" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search seeds, fertilizers, brands..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.sortButton, showSortMenu && styles.activeSortBtn]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <ArrowUpDown size={18} color="#047857" />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown / Options Bar */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {sortOptions.map((opt) => {
            const isSelected = opt.sortBy === sortBy && opt.sortOrder === sortOrder;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.sortOption, isSelected && styles.selectedSortOption]}
                onPress={() => {
                  setSortBy(opt.sortBy);
                  setSortOrder(opt.sortOrder);
                  setShowSortMenu(false);
                }}
              >
                <Text style={[styles.sortOptionText, isSelected && styles.selectedSortOptionText]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Horizontal Category Chips */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <CategoryChip
            label="All Categories"
            isSelected={selectedCategory === 'All'}
            onPress={() => setSelectedCategory('All')}
          />
          {PRODUCT_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              isSelected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      {isLoading ? (
        <LoadingSpinner message="Fetching real catalog products..." />
      ) : errorMsg ? (
        <ErrorMessage message={errorMsg} onRetry={fetchProducts} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.gridCol}>
              <ProductCard
                product={item}
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    productId: item.id || item._id || '',
                    product: item,
                  })
                }
                onAddToCart={() => handleAddToCart(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Products Found"
              description="Try changing your search query or selecting a different category."
              actionTitle="Reset Filters"
              onAction={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchProducts();
              }}
              colors={['#047857']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activeSortBtn: {
    backgroundColor: '#047857',
  },
  sortMenu: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  selectedSortOption: {
    backgroundColor: '#047857',
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  selectedSortOptionText: {
    color: '#ffffff',
  },
  categoriesSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 10,
    paddingBottom: 32,
  },
  gridCol: {
    width: '50%',
  },
});
