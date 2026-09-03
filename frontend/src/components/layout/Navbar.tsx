import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Menu,
  X,
  UserPlus,
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  Package,
  ShoppingCart,
  Landmark,
  Sparkles,
  Truck,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, getRoleDashboardPath } = useAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { t, languagesList, currentLanguageOption, setLanguage } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'SHOP_OWNER':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'DELIVERY_BOY':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'FARMER':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  const getRoleShortLabel = (role?: string) => {
    switch (role) {
      case 'SHOP_OWNER':
        return t('rolePartner', 'Agri Store Partner');

      case 'DELIVERY_BOY':
        return t('roleDelivery', 'Delivery Partner');
      case 'FARMER':
        return t('roleFarmer', 'Farmer');
      case 'ADMIN':
        return 'Admin';
      default:
        return 'User';
    }
  };

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-green-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform">
                <Sprout className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Agro<span className="text-emerald-600 dark:text-emerald-400">Mitra</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase -mt-1 hidden sm:block">
                  Smart Farming • Stronger Connections
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors px-3 py-2 rounded-xl ${
                isActive('/')
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('navHome', 'Home')}
            </Link>

            <Link
              to="/marketplace"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/marketplace')
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('navMarketplace', 'Marketplace')}</span>
            </Link>

            {isAuthenticated && user ? (
              <>
                {/* Farmer Navigation */}
                {user.role === 'FARMER' && (
                  <>
                    <Link
                      to="/ai/crop-disease"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive('/ai/crop-disease') || isActive('/crop-disease')
                          ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40'
                          : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{t('navLeafScanner', 'AI Leaf Scanner')}</span>
                    </Link>

                    <Link
                      to="/schemes"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive('/schemes')
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('navSchemes', 'Govt Schemes')}</span>
                    </Link>

                    <Link
                      to="/cart"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors relative ${
                        isActive('/cart')
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{t('navCart', 'Cart')}</span>
                      {totalItems > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-black text-white bg-emerald-600 rounded-full">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {/* Agri Store Partner Navigation */}
                {user.role === 'SHOP_OWNER' && (

                  <>
                    <Link
                      to="/shop/products"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive('/shop/products') || isActive('/shop-owner/products')
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Inventory</span>
                    </Link>

                    <Link
                      to="/shop/orders"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive('/shop/orders') || isActive('/shop-owner/orders')
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Fulfill Orders</span>
                    </Link>
                  </>
                )}

                {/* Delivery Partner Navigation */}
                {user.role === 'DELIVERY_BOY' && (
                  <Link
                    to="/delivery/dashboard"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isActive('/delivery/dashboard')
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Deliveries</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <a
                  href="#features"
                  className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('navFeatures', 'Features')}
                </a>
                <a
                  href="#ecosystem"
                  className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('seedToMarketTitle', 'Ecosystem')}
                </a>
              </>
            )}
          </div>

          {/* Right Action Icons: Language, Theme, Auth */}
          <div className="hidden md:flex items-center space-x-2.5">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                aria-label="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{currentLanguageOption.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Language / భాష
                  </div>
                  {languagesList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                        currentLanguageOption.code === lang.code
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </span>
                      {currentLanguageOption.code === lang.code && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Authenticated Role Dashboard & Profile */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={getRoleDashboardPath(user.role)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t('navDashboard', 'Dashboard')}</span>
                </Link>

                <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col text-right hidden lg:block">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {user.name || 'User'}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border inline-block ${getRoleBadgeColor(user.role)}`}>
                      {getRoleShortLabel(user.role)}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('navSignIn', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('getStartedBtn', 'Get Started')}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu & Theme Buttons */}
          <div className="flex md:hidden items-center space-x-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top duration-200">
          
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Language:</span>
            <div className="flex flex-wrap gap-1">
              {languagesList.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2 py-1 text-xs rounded-lg font-bold transition-colors ${
                    currentLanguageOption.code === lang.code
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('navHome', 'Home')}
            </Link>

            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('navMarketplace', 'Marketplace')}
            </Link>

            {isAuthenticated && user ? (
              <>
                {user.role === 'FARMER' && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                    >
                      {t('farmerDashboard', 'Farmer Dashboard')}
                    </Link>
                    <Link
                      to="/ai/crop-disease"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t('navLeafScanner', 'AI Leaf Scanner')}
                    </Link>
                    <Link
                      to="/schemes"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t('navSchemes', 'Govt Schemes')}
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t('navOrders', 'My Orders')}
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span>{t('navCart', 'Cart')}</span>
                      {totalItems > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded-full font-bold">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {user.role === 'SHOP_OWNER' && (
                  <>
                    <Link
                      to="/shop/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                    >
                      Store Partner Orders

                    </Link>
                    <Link
                      to="/shop/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Manage Inventory
                    </Link>
                  </>
                )}

                {user.role === 'DELIVERY_BOY' && (
                  <Link
                    to="/delivery/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                  >
                    Delivery Partner Dashboard
                  </Link>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {user.name} ({getRoleShortLabel(user.role)})
                  </span>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl"
                  >
                    {t('navLogout', 'Sign Out')}
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-200"
                >
                  {t('navSignIn', 'Sign In')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm"
                >
                  {t('getStartedBtn', 'Get Started')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
