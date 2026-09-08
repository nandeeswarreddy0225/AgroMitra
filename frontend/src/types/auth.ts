export type UserRole = 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'ADMIN' | 'MARKET_OWNER';

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  address?: UserAddress;
  shopName?: string;
  upiId?: string;
  qrCodeUrl?: string;
  market?: any;
  isApproved?: boolean;
  status?: 'ACTIVE' | 'PENDING' | 'DISABLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  address?: UserAddress;
  shopName?: string;
  upiId?: string;
  qrCodeUrl?: string;
}

export interface LoginCredentials {
  phone?: string;
  email?: string;
  identifier?: string;
  password: string;
  role?: UserRole;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'MARKET_OWNER';
  address?: UserAddress;
  marketName?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export const getRoleDisplayName = (role?: UserRole | string): string => {
  switch (role) {
    case 'AGRI_PARTNER':
    case 'SHOP_OWNER':
      return 'Agri Store Partner';

    case 'FARMER':
      return 'Farmer';
    case 'DELIVERY_BOY':
      return 'Delivery Partner';
    case 'MARKET_OWNER':
      return 'Market / Mandi Owner';
    case 'ADMIN':
      return 'Administrator';
    default:
      return 'User';
  }
};

export const getRoleDashboardPath = (role?: UserRole | string): string => {
  const normalizedRole = (role || '').toString().trim().toUpperCase();
  switch (normalizedRole) {
    case 'FARMER':
      return '/farmer/dashboard';
    case 'SHOP_OWNER':
      return '/shop-owner/dashboard';
    case 'AGRI_PARTNER':
      return '/agri-partner/dashboard';
    case 'DELIVERY_BOY':
      return '/delivery-boy/dashboard';
    case 'MARKET_OWNER':
      return '/market-owner/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/login';
  }
};

export const isPathAllowedForRole = (pathname: string, role?: UserRole | string): boolean => {
  if (!pathname || !role) return false;

  const normalizedRole = (role || '').toString().trim().toUpperCase();
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(cleanPath)) {
    return false;
  }

  if (normalizedRole === 'ADMIN') {
    return true;
  }

  if (
    cleanPath === '/' ||
    cleanPath === '/marketplace' ||
    cleanPath.startsWith('/marketplace/') ||
    cleanPath === '/market/prices' ||
    cleanPath === '/mandi-prices' ||
    cleanPath === '/schemes' ||
    cleanPath === '/government-schemes' ||
    cleanPath === '/profile'
  ) {
    return true;
  }

  if (normalizedRole === 'FARMER') {
    return (
      cleanPath === '/dashboard' ||
      cleanPath === '/farmer/dashboard' ||
      cleanPath === '/farmer/crop-disease' ||
      cleanPath === '/farmer/schemes' ||
      cleanPath === '/farmer/cart' ||
      cleanPath === '/farmer/checkout' ||
      cleanPath === '/farmer/orders' ||
      cleanPath.startsWith('/farmer/orders/') ||
      cleanPath === '/cart' ||
      cleanPath === '/checkout' ||
      cleanPath === '/orders' ||
      cleanPath.startsWith('/orders/') ||
      cleanPath === '/ai/crop-disease' ||
      cleanPath === '/crop-disease' ||
      cleanPath === '/market/prices' ||
      cleanPath === '/mandi-prices'
    );
  }

  if (normalizedRole === 'MARKET_OWNER') {
    return (
      cleanPath === '/market-owner/dashboard' ||
      cleanPath === '/market-owner' ||
      cleanPath === '/market-dashboard' ||
      cleanPath === '/market/prices' ||
      cleanPath === '/mandi-prices' ||
      cleanPath.startsWith('/market-owner/')
    );
  }

  if (normalizedRole === 'SHOP_OWNER') {
    return (
      cleanPath === '/shop-owner/dashboard' ||
      cleanPath === '/shop-owner' ||
      cleanPath === '/store-dashboard' ||
      cleanPath === '/shop-owner/products' ||
      cleanPath === '/shop-owner/orders' ||
      cleanPath === '/inventory' ||
      cleanPath === '/admin/products' ||
      cleanPath === '/shop/orders' ||
      cleanPath === '/shop/products' ||
      cleanPath.startsWith('/shop-owner/') ||
      cleanPath.startsWith('/shop/')
    );
  }

  if (normalizedRole === 'AGRI_PARTNER') {
    return (
      cleanPath === '/agri-partner/dashboard' ||
      cleanPath === '/agri-partner' ||
      cleanPath === '/agri-partner/products' ||
      cleanPath === '/agri-partner/orders' ||
      cleanPath === '/shop-owner/dashboard' ||
      cleanPath === '/shop-owner' ||
      cleanPath === '/store-dashboard' ||
      cleanPath === '/shop-owner/products' ||
      cleanPath === '/shop-owner/orders' ||
      cleanPath === '/inventory' ||
      cleanPath === '/admin/products' ||
      cleanPath === '/shop/orders' ||
      cleanPath === '/shop/products' ||
      cleanPath.startsWith('/agri-partner/') ||
      cleanPath.startsWith('/shop-owner/') ||
      cleanPath.startsWith('/shop/')
    );
  }

  if (normalizedRole === 'DELIVERY_BOY') {
    return (
      cleanPath === '/delivery/dashboard' ||
      cleanPath === '/delivery-boy/dashboard' ||
      cleanPath === '/delivery-boy' ||
      cleanPath === '/delivery' ||
      cleanPath.startsWith('/delivery/') ||
      cleanPath.startsWith('/delivery-boy/')
    );
  }

  return false;
};

export const getPostLoginRedirectPath = (fromPath?: string | null, role?: UserRole | string): string => {
  if (!role) return '/login';
  const normalizedRole = (role || '').toString().trim().toUpperCase() as UserRole;
  const defaultDashboard = getRoleDashboardPath(normalizedRole);

  // If the previous path was home, an auth page, a generic profile alias, or any dashboard route,
  // redirect directly to the user's specific role dashboard
  if (!fromPath || fromPath === '/' || fromPath === '/home' || fromPath === '/login' || fromPath === '/register' || fromPath.includes('dashboard') || fromPath === '/profile') {
    return defaultDashboard;
  }

  // If the user intended to access a specific allowed non-dashboard page (e.g. /cart, /checkout, /marketplace/...)
  if (isPathAllowedForRole(fromPath, normalizedRole)) {
    return fromPath;
  }

  return defaultDashboard;
};

