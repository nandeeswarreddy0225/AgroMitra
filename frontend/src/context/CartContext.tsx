import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getCartApi,
  addToCartApi,
  updateCartItemQuantityApi,
  removeCartItemApi,
  clearCartApi,
} from '../services/api';
import { CartData, CartItem } from '../types/cart';

interface CartContextType {
  cart: CartData | null;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'FARMER') {
      setCart(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await getCartApi();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (err) {
      console.error('Failed to load farmer cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const res = await addToCartApi({ productId, quantity });
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const res = await updateCartItemQuantityApi(productId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    setIsLoading(true);
    try {
      const res = await removeCartItemApi(productId);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const res = await clearCartApi();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items || [],
        totalItems: cart?.totalItems || 0,
        subtotal: cart?.subtotal || 0,
        total: cart?.total || 0,
        isLoading,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
