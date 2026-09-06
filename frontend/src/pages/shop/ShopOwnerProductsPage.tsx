import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  ToggleLeft,
  ToggleRight,
  UploadCloud,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getShopOwnerProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '../../services/api';
import { Product, CreateProductData, PRODUCT_CATEGORIES } from '../../types/product';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

export const ShopOwnerProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Category State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  // Delete Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Toggling status state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    category: 'Seeds',
    brand: '',
    price: 0,
    unit: 'kg',
    stock: 0,
    description: '',
    image: '',
    isActive: true,
    location: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getShopOwnerProductsApi();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load products from database.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && p.stock > 0) ||
      (stockFilter === 'out_of_stock' && p.stock <= 0);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive !== false) ||
      (statusFilter === 'disabled' && p.isActive === false);

    return matchesSearch && matchesCategory && matchesStock && matchesStatus;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setIsCustomCategory(false);
    setCustomCategoryText('');
    setFormData({
      name: '',
      category: 'Seeds',
      brand: '',
      price: 0,
      unit: 'kg',
      stock: 0,
      description: '',
      image: '',
      isActive: true,
      location: {
        street: user?.address?.street || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        pincode: user?.address?.pincode || '',
      },
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const isStandard = (PRODUCT_CATEGORIES as readonly string[]).includes(product.category);
    setIsCustomCategory(!isStandard);
    setCustomCategoryText(!isStandard ? product.category : '');
    setFormData({
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      description: product.description,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      isActive: product.isActive !== false,
      location: {
        street: product.location?.street || '',
        city: product.location?.city || '',
        state: product.location?.state || '',
        pincode: product.location?.pincode || '',
      },
    });
    setIsAddModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleStatus = async (product: Product) => {
    const prodId = (product.id || product._id) as string;
    if (!prodId) return;

    const newStatus = product.isActive === false;
    setTogglingId(prodId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateProductApi(prodId, { isActive: newStatus });
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => ((p.id || p._id) === prodId ? { ...p, isActive: newStatus } : p))
        );
        setSuccessMsg(
          `Product "${product.name}" is now ${newStatus ? 'Active in Marketplace' : 'Disabled / Hidden'}.`
        );
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to update product availability status.');
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const finalCategory = isCustomCategory ? customCategoryText.trim() : formData.category.trim();
    if (!finalCategory) {
      setErrorMsg('Product category is required.');
      setIsSubmitting(false);
      return;
    }

    if (formData.price <= 0) {
      setErrorMsg('Price must be greater than ₹0.');
      setIsSubmitting(false);
      return;
    }

    if (formData.stock < 0) {
      setErrorMsg('Stock quantity cannot be negative.');
      setIsSubmitting(false);
      return;
    }

    const payload: CreateProductData = {
      ...formData,
      category: finalCategory,
      brand: formData.brand?.trim() || 'Generic',
      isActive: formData.isActive !== false,
    };

    try {
      if (editingProduct) {
        const prodId = (editingProduct.id || editingProduct._id) as string;
        const res = await updateProductApi(prodId, payload);
        if (res.success) {
          setSuccessMsg(`Successfully updated "${payload.name}" in catalog.`);
          setIsAddModalOpen(false);
          await fetchProducts();
        }
      } else {
        const res = await createProductApi(payload);
        if (res.success) {
          setSuccessMsg(`Successfully created and listed "${payload.name}" in catalog.`);
          setIsAddModalOpen(false);
          await fetchProducts();
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to save product to database. Please verify all inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const prodId = (deletingProduct.id || deletingProduct._id) as string;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await deleteProductApi(prodId);
      if (res.success) {
        setSuccessMsg(`Product "${deletingProduct.name}" permanently deleted.`);
        setDeletingProduct(null);
        await fetchProducts();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to delete product from database.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = products.filter((p) => p.isActive !== false).length;
  const inStockCount = products.filter((p) => p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <span>{isAdmin ? 'AgroMitra Product Inventory Management' : 'My Product Inventory'}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Administrator Catalog Control: Add, update pricing, manage stock, enable/disable availability, and delete products across the entire platform.'
              : 'Manage your certified seed, crop protection, and agricultural equipment catalog with real-time database pricing and stock.'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-300 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Products</span>
          <span className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">{products.length}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active / Listed</span>
          <span className="text-2xl font-heading font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Stock</span>
          <span className="text-2xl font-heading font-black text-blue-600 dark:text-blue-400 mt-1">{inStockCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Out of Stock</span>
          <span className="text-2xl font-heading font-black text-rose-600 dark:text-rose-400 mt-1">{outOfStockCount}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by product name, brand, description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Stock Filter */}
          <div className="md:col-span-3">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock Only (&gt; 0)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Availability Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Availability (Active &amp; Disabled)</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled / Hidden Only</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'All'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List / Cards */}
      {isLoading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading live product inventory from MongoDB...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="min-h-[320px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
              {products.length === 0 ? 'No products in database' : 'No matching products found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {products.length === 0
                ? "The product catalog is currently empty. Click 'Add New Product' to list your first verified agricultural product."
                : 'No products match your current search and filter criteria.'}
            </p>
          </div>
          {products.length === 0 ? (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Product</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setStockFilter('all');
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const prodId = product.id || product._id;
            const isToggling = togglingId === prodId;
            const isActive = product.isActive !== false;

            return (
              <div
                key={prodId}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                  isActive ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 dark:border-slate-700 opacity-80'
                } overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
              >
                <div>
                  {/* Image Header */}
                  <div className="h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Package className="w-12 h-12" />
                        <span className="text-[11px] mt-1">No Image Provided</span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                      {product.category}
                    </span>

                    {/* Stock Status Badge */}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                        product.stock > 5
                          ? 'bg-emerald-500 text-white'
                          : product.stock > 0
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {product.stock > 5
                        ? `In Stock: ${product.stock}`
                        : product.stock > 0
                        ? `Low Stock: ${product.stock}`
                        : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                          {product.brand || 'Generic'}
                        </span>
                        <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white line-clamp-1">
                          {product.name}
                        </h3>
                      </div>
                      
                      {/* Availability Pill */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Price & Unit Details */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                        <span className="text-xl font-heading font-black text-slate-900 dark:text-white">
                          ₹{product.price}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / {product.unit}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Inventory Unit</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{product.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Toggle Status Button */}
                    <button
                      onClick={() => handleToggleStatus(product)}
                      disabled={isToggling}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        isActive
                          ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={isActive ? 'Click to disable and hide from marketplace' : 'Click to enable in marketplace'}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{isActive ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    <Link
                      to={`/marketplace/product/${prodId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-1 rounded"
                      title="View Public Marketplace Page"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Edit Product Details & Price"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(product)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{editingProduct ? 'Edit Agricultural Product' : 'Add New Agricultural Product'}</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Certified Hybrid Cotton Seeds"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={isCustomCategory ? 'OTHER' : formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setIsCustomCategory(true);
                        setCustomCategoryText(formData.category || '');
                      } else {
                        setIsCustomCategory(false);
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {formData.category && !(PRODUCT_CATEGORIES as readonly string[]).includes(formData.category) && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                    <option value="OTHER">+ Custom Agricultural Category...</option>
                  </select>

                  {isCustomCategory && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        placeholder="Enter custom category name (e.g. Soil Nutrients)"
                        value={customCategoryText}
                        onChange={(e) => {
                          setCustomCategoryText(e.target.value);
                          setFormData({ ...formData, category: e.target.value });
                        }}
                        className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. IFFCO, Bayer, Syngenta, Rasi"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, litre, 50kg bag, bottle, packet"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price in INR (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 850.00"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Description & Specifications <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed agricultural specifications, composition, application guidelines, recommended dosage..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Image Input (URL or Upload) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Product Image (URL or Local File)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/product-photo.jpg"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors">
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                  </label>
                </div>
                {formData.image && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-md border border-slate-300 dark:border-slate-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] text-slate-500 truncate flex-1">{formData.image.slice(0, 50)}...</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Marketplace Availability</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formData.isActive !== false ? 'Product is visible and purchasable in the marketplace' : 'Product is disabled and hidden from farmers'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: formData.isActive === false })}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    formData.isActive !== false
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {formData.isActive !== false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{formData.isActive !== false ? 'Active' : 'Disabled'}</span>
                </button>
              </div>

              {/* Store Location */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Store / Pickup Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Street / Market Address"
                  value={formData.location?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: { ...(formData.location || {}), street: e.target.value },
                    })
                  }
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.location?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...(formData.location || {}), city: e.target.value },
                      })
                    }
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.location?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...(formData.location || {}), state: e.target.value },
                      })
                    }
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={formData.location?.pincode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...(formData.location || {}), pincode: e.target.value },
                      })
                    }
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingProduct ? 'Save Changes' : 'Publish Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">Confirm Product Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>"{deletingProduct.name}"</strong>? This will remove the product from the MongoDB database and the marketplace.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
