export type UserRole = 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'ADMIN';

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
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY';
  address?: UserAddress;
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
    case 'ADMIN':
      return 'Administrator';
    default:
      return 'User';
  }
};

export const getRoleDashboardPath = (role?: UserRole | string): string => {
  switch (role) {
    case 'FARMER':
      return '/dashboard';
    case 'AGRI_PARTNER':
    case 'SHOP_OWNER':
      return '/shop-owner/dashboard';
    case 'DELIVERY_BOY':
      return '/delivery/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/';
  }
};

export const isPathAllowedForRole = (pathname: string, role?: UserRole | string): boolean => {
  if (!pathname || !role) return false;

  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(cleanPath)) {
    return false;
  }

  if (role === 'ADMIN') {
    return true;
  }

  if (
    cleanPath === '/' ||
    cleanPath === '/marketplace' ||
    cleanPath.startsWith('/marketplace/') ||
    cleanPath === '/schemes' ||
    cleanPath === '/government-schemes' ||
    cleanPath === '/profile'
  ) {
    return true;
  }

  if (role === 'FARMER') {
    return (
      cleanPath === '/dashboard' ||
      cleanPath === '/farmer/dashboard' ||
      cleanPath === '/cart' ||
      cleanPath === '/checkout' ||
      cleanPath === '/orders' ||
      cleanPath.startsWith('/orders/') ||
      cleanPath === '/ai/crop-disease' ||
      cleanPath === '/crop-disease'
    );
  }

  if (role === 'SHOP_OWNER' || role === 'AGRI_PARTNER') {
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

  if (role === 'DELIVERY_BOY') {
    return (
      cleanPath === '/delivery/dashboard' ||
      cleanPath === '/delivery-boy/dashboard' ||
      cleanPath.startsWith('/delivery/')
    );
  }

  return false;
};

export const getPostLoginRedirectPath = (fromPath?: string | null, role?: UserRole | string): string => {
  if (fromPath && fromPath !== '/' && isPathAllowedForRole(fromPath, role)) {
    return fromPath;
  }
  return getRoleDashboardPath(role);
};
