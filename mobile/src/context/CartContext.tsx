import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CartData, CartItem } from '../types/cart';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartData | null;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  total: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await cartApi.getCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch {
      // Cart may not exist yet or empty
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await cartApi.addToCart({ productId, quantity });
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number): Promise<void> => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    setIsLoading(true);
    try {
      const res = await cartApi.updateItemQuantity(productId, { quantity });
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await cartApi.removeItem(productId);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await cartApi.clearCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = cart?.totalItems ?? cart?.items?.reduce((acc, it) => acc + it.quantity, 0) ?? 0;
  const subtotal = cart?.subtotal ?? cart?.items?.reduce((acc, it) => acc + it.subtotal, 0) ?? 0;
  const total = cart?.total ?? subtotal;

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items ?? [],
        totalItems,
        subtotal,
        total,
        isLoading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
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
