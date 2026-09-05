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
