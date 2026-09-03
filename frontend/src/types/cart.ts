import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
  priceAtAdd: number;
  currentPrice: number;
  currentStock: number;
  unit: string;
  subtotal: number;
  isAvailable: boolean;
}

export interface CartData {
  id?: string;
  farmer: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
}

export interface CartResponse {
  success: boolean;
  cart: CartData;
  message?: string;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}
