import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { FarmerDashboard } from './pages/dashboards/FarmerDashboard';
import { ShopOwnerDashboard } from './pages/dashboards/ShopOwnerDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { DeliveryBoyDashboard } from './pages/delivery/DeliveryBoyDashboard';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ProductDetailPage } from './pages/marketplace/ProductDetailPage';
import { ShopOwnerProductsPage } from './pages/shop/ShopOwnerProductsPage';
import { ShopOwnerOrdersPage } from './pages/shop/ShopOwnerOrdersPage';
import { CartPage } from './pages/cart/CartPage';
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { FarmerOrdersPage } from './pages/orders/FarmerOrdersPage';
import { PaymentPage } from './pages/orders/PaymentPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { GovernmentSchemesPage } from './pages/schemes/GovernmentSchemesPage';
import { CropDiseasePage } from './pages/ai/CropDiseasePage';
import { MarketOwnerDashboard } from './pages/dashboards/MarketOwnerDashboard';
import { MarketOwnerPricesPage } from './pages/market-owner/MarketOwnerPricesPage';
import { MarketOwnerPriceHistoryPage } from './pages/market-owner/MarketOwnerPriceHistoryPage';
import { MarketOwnerMarketPage } from './pages/market-owner/MarketOwnerMarketPage';
import { MarketOwnerWeatherPage } from './pages/market-owner/MarketOwnerWeatherPage';
import { MarketOwnerProfilePage } from './pages/market-owner/MarketOwnerProfilePage';
import { FarmerMarketPricesPage } from './pages/market/FarmerMarketPricesPage';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

const RoleProfileRedirect: React.FC = () => {
  const { user, getRoleDashboardPath } = useAuth();
  return <Navigate to={getRoleDashboardPath(user?.role)} replace />;
};

const RootEntryRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading, getRoleDashboardPath } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading AgroMitra...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Root Entry: Unauthenticated -> /login, Authenticated -> Role Dashboard */}
              <Route index element={<RootEntryRedirect />} />
              <Route path="home" element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="marketplace" element={<MarketplacePage />} />
              <Route path="marketplace/product/:id" element={<ProductDetailPage />} />
              <Route path="schemes" element={<GovernmentSchemesPage />} />
              <Route path="government-schemes" element={<GovernmentSchemesPage />} />
              <Route path="market/prices" element={<FarmerMarketPricesPage />} />
              <Route path="mandi-prices" element={<FarmerMarketPricesPage />} />
              <Route path="mandi" element={<FarmerMarketPricesPage />} />


              {/* Protected Farmer Routes */}
              <Route
                path="ai/crop-disease"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <CropDiseasePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="crop-disease"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <CropDiseasePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="cart"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <CartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="checkout"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <FarmerOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders/:id/payment"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="farmer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['FARMER']}>
                    <FarmerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Fertilizer & Pesticide Shop Owner & Agri Partner Routes */}
              <Route
                path="shop-owner/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="shop-owner"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agri-partner/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['AGRI_PARTNER', 'SHOP_OWNER']}>
                    <ShopOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agri-partner"
                element={
                  <ProtectedRoute allowedRoles={['AGRI_PARTNER', 'SHOP_OWNER']}>
                    <ShopOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agri-partner/products"
                element={
                  <ProtectedRoute allowedRoles={['AGRI_PARTNER', 'SHOP_OWNER', 'ADMIN']}>
                    <ShopOwnerProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agri-partner/orders"
                element={
                  <ProtectedRoute allowedRoles={['AGRI_PARTNER', 'SHOP_OWNER']}>
                    <ShopOwnerOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="store-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Product Management Routes (Shop Owner & Admin) */}
              <Route
                path="shop-owner/products"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN']}>
                    <ShopOwnerProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN']}>
                    <ShopOwnerProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/products"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="shop-owner/orders"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="shop/orders"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER']}>
                    <ShopOwnerOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="shop/products"
                element={
                  <ProtectedRoute allowedRoles={['SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN']}>
                    <ShopOwnerProductsPage />
                  </ProtectedRoute>
                }
              />


              {/* Profile Route Alias */}
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <RoleProfileRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Protected Delivery Boy Routes */}
              <Route
                path="delivery/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['DELIVERY_BOY']}>
                    <DeliveryBoyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="delivery-boy/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['DELIVERY_BOY']}>
                    <DeliveryBoyDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Market Owner Routes */}
              <Route
                path="market-owner/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner/prices"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerPricesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner/price-history"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerPriceHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner/market"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerMarketPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner/weather"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerWeatherPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner/profile"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-owner"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="market-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['MARKET_OWNER', 'ADMIN']}>
                    <MarketOwnerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </LanguageProvider>
</ThemeProvider>
  );
};

export default App;
