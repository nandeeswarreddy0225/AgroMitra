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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getShopOwnerProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '../../services/api';
import { Product, ProductCategory, CreateProductData, PRODUCT_CATEGORIES } from '../../types/product';
import axios from 'axios';


export const ShopOwnerProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

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
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Seeds',
      brand: '',

      price: 0,
      unit: 'kg',
      stock: 0,
      description: '',
      image: '',
      location: {
        street: '',
        city: '',
        state: '',
        pincode: '',
      },
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      description: product.description,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      location: {
        street: product.location?.street || '',
        city: product.location?.city || '',
        state: product.location?.state || '',
        pincode: product.location?.pincode || '',
      },
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        const prodId = (editingProduct.id || editingProduct._id) as string;
        const res = await updateProductApi(prodId, formData);
        if (res.success) {
          setSuccessMsg(`Successfully updated "${formData.name}" in your inventory.`);
          setIsAddModalOpen(false);
          await fetchProducts();
        }
      } else {
        const res = await createProductApi(formData);
        if (res.success) {
          setSuccessMsg(`Successfully added "${formData.name}" to your inventory.`);
          setIsAddModalOpen(false);
          await fetchProducts();
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to save product to database. Please check all fields.');
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
        setSuccessMsg(`Product "${deletingProduct.name}" removed from inventory.`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <span>My Product Inventory</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your certified seed, crop protection, and agricultural equipment catalog with real-time database pricing and stock.
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

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search your inventory by product name, category, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm placeholder-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Products</span>
          <span className="text-lg font-heading font-bold text-slate-900 dark:text-white">{products.length}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Stock</span>
          <span className="text-lg font-heading font-bold text-emerald-600 dark:text-emerald-400">
            {products.filter((p) => p.stock > 0).length}
          </span>
        </div>
      </div>

      {/* Product Grid / Table */}
      {isLoading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading your product inventory from MongoDB...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">No products found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {products.length === 0
                ? "You haven't listed any products yet. Click 'Add New Product' to list your first fertilizer or agricultural item."
                : 'No products match your current search query.'}
            </p>
          </div>
          {products.length === 0 && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Product</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const prodId = product.id || product._id;
            return (
              <div
                key={prodId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
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
                        <span className="text-xs mt-1">No image provided</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                      {product.category}
                    </span>
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                        product.stock > 0
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          {product.brand}
                        </span>
                        <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white line-clamp-1">{product.name}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-medium">Price</span>
                        <span className="text-lg font-heading font-black text-slate-900 dark:text-white">
                          ₹{product.price}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / {product.unit}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 uppercase font-medium">Stock Unit</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{product.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    to={`/marketplace/product/${prodId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                    title="View in Marketplace"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Public Page</span>
                  </Link>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Edit Product Price / Stock"
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
                <span>{editingProduct ? 'Edit Product' : 'Add New Product to Inventory'}</span>
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
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. IFFCO, Bayer, Syngenta"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measurement <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, liter, 50kg bag, bottle, packet"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price in INR (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1250.00"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Available Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 100"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed specifications, usage instructions, chemical composition, dosage..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/product-image.jpg"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Shop / Product Location */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Shop / Pickup Location (Optional)
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
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingProduct ? 'Save Changes' : 'Add to Inventory'}</span>
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
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>"{deletingProduct.name}"</strong>? This will permanently remove it from the Marketplace.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
