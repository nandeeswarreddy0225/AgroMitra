import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Package,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getProductByIdApi } from '../../services/api';
import { Product } from '../../types/product';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import axios from 'axios';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [cartSuccessMsg, setCartSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await getProductByIdApi(id);
        if (data.success && data.product) {
          setProduct(data.product);
          setQuantity(data.product.stock > 0 ? 1 : 0);
        } else {
          setErrorMsg('Product could not be found.');
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          setErrorMsg(err.response.data.message);
        } else {
          setErrorMsg('Failed to load product details from server.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleIncrement = () => {
    if (!product) return;
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'FARMER') {
      setErrorMsg('Only registered Farmers can add products to cart and place orders.');
      return;
    }

    if (product.stock <= 0) {
      setErrorMsg('This product is currently Out of Stock.');
      return;
    }

    if (quantity > product.stock) {
      setErrorMsg(`Requested quantity exceeds available stock (${product.stock} ${product.unit} available).`);
      return;
    }

    setIsAdding(true);
    setErrorMsg(null);
    try {
      const prodId = (product.id || product._id) as string;
      if (!prodId) throw new Error('Product ID missing');
      await addToCart(prodId, quantity);
      setCartSuccessMsg(`Added ${quantity} ${product.unit} of ${product.name} to your Cart.`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to add product to cart.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center max-w-7xl mx-auto px-4 py-16">
        <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mb-3" />
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">Loading product details from database...</p>
      </div>
    );
  }

  if (errorMsg && !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{errorMsg || 'The requested product does not exist or has been removed.'}</p>
        <div className="pt-4">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const shop = typeof product.shopOwner === 'object' ? product.shopOwner : null;
  const shopName = shop?.shopName || shop?.name || 'Agri Store Partner';
  const shopPhone = shop?.phone;

  const shopEmail = shop?.email;
  const shopLocation = [
    product.location?.street || shop?.address?.street,
    product.location?.city || shop?.address?.city,
    product.location?.state || shop?.address?.state,
    product.location?.pincode || shop?.address?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/marketplace')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </button>

      {/* Cart Success Alert */}
      {cartSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{cartSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Go to Cart</span>
            </Link>
            <button onClick={() => setCartSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 text-xs font-semibold">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-300 hover:text-rose-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Product View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {/* Left Column: Image */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="h-80 sm:h-96 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center border border-slate-200 dark:border-slate-700">
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
                <Package className="w-16 h-16" />
                <span className="text-sm mt-2">No product image uploaded</span>
              </div>
            )}
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
              {product.category}
            </span>
          </div>
        </div>

        {/* Right Column: Details & Ordering */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Brand: {product.brand}
              </span>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white mt-1">
                {product.name}
              </h1>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block uppercase">
                  Verified Retail Price
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-heading font-black text-slate-900 dark:text-white">
                    ₹{product.price}
                  </span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    / {product.unit}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    product.stock > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {product.stock > 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>In Stock ({product.stock} {product.unit} available)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Out of Stock</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Product Description & Specifications
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity:</span>
                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                  <button
                    onClick={handleDecrement}
                    disabled={quantity <= 1 || product.stock === 0}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold font-mono text-slate-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={quantity >= product.stock || product.stock === 0}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{product.unit}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAdding}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Adding to Cart...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Supplier Info Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fulfilled by: {shopName}</span>
            </div>
            {shopLocation && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{shopLocation}</span>
              </div>
            )}
            {shopPhone && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Contact: {shopPhone}</span>
              </div>
            )}
            {shopEmail && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Email: {shopEmail}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
