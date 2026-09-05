import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Package,
  Store,
  MapPin,
  ArrowRight,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { getProductsApi } from '../../services/api';
import { Product, PRODUCT_CATEGORIES } from '../../types/product';
import { useTranslation } from '../../context/LanguageContext';
import axios from 'axios';

export const MarketplacePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<string>('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { t } = useTranslation();

  const fetchMarketplaceProducts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (category && category !== 'All') params.category = category;
      if (minPrice !== '') params.minPrice = Number(minPrice);
      if (maxPrice !== '') params.maxPrice = Number(maxPrice);
      if (inStockOnly) params.inStock = true;
      if (sort) params.sort = sort;

      const data = await getProductsApi(params);
      if (data.success && Array.isArray(data.products)) {
        const seen = new Set<string>();
        const uniqueProducts = data.products.filter((p) => {
          const id = p.id || p._id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setProducts(uniqueProducts);
      } else {
        setProducts([]);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load marketplace products from database.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const params: Record<string, any> = {};
        if (search.trim()) params.search = search.trim();
        if (category && category !== 'All') params.category = category;
        if (minPrice !== '') params.minPrice = Number(minPrice);
        if (maxPrice !== '') params.maxPrice = Number(maxPrice);
        if (inStockOnly) params.inStock = true;
        if (sort) params.sort = sort;

        const data = await getProductsApi(params);
        if (isCurrent) {
          if (data.success && Array.isArray(data.products)) {
            const seen = new Set<string>();
            const uniqueProducts = data.products.filter((p) => {
              const id = p.id || p._id;
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            setProducts(uniqueProducts);
          } else {
            setProducts([]);
          }
        }
      } catch (err: unknown) {
        if (isCurrent) {
          if (axios.isAxiosError(err) && err.response?.data?.message) {
            setErrorMsg(err.response.data.message);
          } else {
            setErrorMsg('Failed to load marketplace products from database.');
          }
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCurrent = false;
    };
  }, [category, inStockOnly, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMarketplaceProducts();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-900 dark:from-emerald-950 dark:to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden transition-colors">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct From Verified Retail Stores</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight">
            AgroMitra Marketplace
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 dark:text-slate-300">
            Browse certified seeds, bio-pesticides, crop protection, and agricultural equipment directly from verified local Agri Store Partners.
          </p>


        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by product name, brand (e.g. IFFCO, Bayer), category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-24 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="absolute inset-y-1.5 right-1.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="md:hidden p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setCategory('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              category === 'All'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Products
          </button>
          {Array.from(new Set([...PRODUCT_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)])).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  category === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Marketplace Product Grid */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            {t('loading', 'Loading marketplace products...')}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="min-h-[350px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white">No matching products found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            No products match your current search and filter criteria. Try adjusting your filters or search terms.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
          >
            <span>Clear All Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Showing <strong>{products.length}</strong> available products</span>
            <span>Verified Agri Store Partner Inventory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const prodId = product.id || product._id;
              const shop = typeof product.shopOwner === 'object' ? product.shopOwner : null;
              const shopName = shop?.shopName || shop?.name || 'Agri Store Partner';

              const shopCity = product.location?.city || shop?.address?.city || 'Local Area';
              const shopState = product.location?.state || shop?.address?.state || '';

              return (
                <div
                  key={prodId}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Product Image & Badges */}
                    <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                      {product.images && product.images.length > 0 && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Package className="w-12 h-12" />
                          <span className="text-[11px] mt-1">Agricultural Product</span>
                        </div>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-800 dark:text-slate-200 shadow-sm">
                        {product.category}
                      </span>

                      {/* Stock Status Badge */}
                      <span
                        className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${
                          product.stock > 0
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          {product.brand}
                        </span>
                        <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {product.name}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Store & Location */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-medium truncate">{shopName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 text-[11px] truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {[shopCity, shopState].filter(Boolean).join(', ') || 'Local Market'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Live Database Price & Action */}
                  <div className="p-5 pt-0">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl flex items-center justify-between mb-3 border border-slate-100 dark:border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          {t('price', 'Price')}
                        </span>
                        <span className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                          ₹{product.price}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                        per {product.unit}
                      </span>
                    </div>

                    <Link
                      to={`/marketplace/product/${prodId}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold transition-colors shadow-sm"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
