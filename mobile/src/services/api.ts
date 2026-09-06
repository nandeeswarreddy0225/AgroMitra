import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { storage } from './storage';
import { AuthResponse, LoginCredentials, RegisterData, User, UpdateProfileData } from '../types/auth';
import { ProductQueryParams, ProductsResponse, SingleProductResponse } from '../types/product';
import { AddToCartInput, CartResponse, UpdateCartItemInput } from '../types/cart';
import { OrdersResponse, SingleOrderResponse } from '../types/order';
import { CropAnalysis, AnalyzeCropResponse, PredictionHistoryResponse } from '../types/cropHealth';

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: Attach JWT token from SecureStore and handle FormData boundaries
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore token read error
    }
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      } else if (config.headers) {
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Global 401 Unauthorized handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        await storage.clearAll();
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH API
// ============================================================================
export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return res.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<{ success: boolean; user: User; message: string }> {
    const res = await apiClient.put<{ success: boolean; user: User; message: string }>('/auth/profile', data);
    return res.data;
  },
};

// ============================================================================
// PRODUCTS API
// ============================================================================
export const productsApi = {
  async getProducts(params?: ProductQueryParams): Promise<ProductsResponse> {
    const res = await apiClient.get<ProductsResponse>('/products', { params });
    return res.data;
  },

  async getProductById(id: string): Promise<SingleProductResponse> {
    const res = await apiClient.get<SingleProductResponse>(`/products/${id}`);
    return res.data;
  },

  async getCategories(): Promise<{ success: boolean; categories: string[] }> {
    const res = await apiClient.get<{ success: boolean; categories: string[] }>('/products/categories');
    return res.data;
  },
};

// ============================================================================
// CART API
// ============================================================================
export const cartApi = {
  async getCart(): Promise<CartResponse> {
    const res = await apiClient.get<CartResponse>('/cart');
    return res.data;
  },

  async addToCart(input: AddToCartInput): Promise<CartResponse> {
    const res = await apiClient.post<CartResponse>('/cart/items', input);
    return res.data;
  },

  async updateItemQuantity(productId: string, input: UpdateCartItemInput): Promise<CartResponse> {
    const res = await apiClient.put<CartResponse>(`/cart/items/${productId}`, { quantity: input.quantity });
    return res.data;
  },

  async removeItem(productId: string): Promise<CartResponse> {
    const res = await apiClient.delete<CartResponse>(`/cart/items/${productId}`);
    return res.data;
  },

  async clearCart(): Promise<CartResponse> {
    const res = await apiClient.delete<CartResponse>('/cart');
    return res.data;
  },
};

// ============================================================================
// ORDERS API
// ============================================================================
export const ordersApi = {
  async getMyOrders(): Promise<OrdersResponse> {
    const res = await apiClient.get<OrdersResponse>('/orders');
    return res.data;
  },

  async getOrderById(id: string): Promise<SingleOrderResponse> {
    const res = await apiClient.get<SingleOrderResponse>(`/orders/${id}`);
    return res.data;
  },

  async createOrder(data: {
    deliveryAddress: { street: string; city: string; state: string; pincode: string };
    paymentMethod?: string;
  }): Promise<SingleOrderResponse> {
    const res = await apiClient.post<SingleOrderResponse>('/orders', data);
    return res.data;
  },
};

// ============================================================================
// PAYMENTS API
// ============================================================================
export const paymentsApi = {
  async getOrderUpiDetails(orderId: string): Promise<{
    success: boolean;
    upiConfigured: boolean;
    storeName?: string;
    merchantName?: string;
    upiId?: string;
    phoneNumber?: string;
    amount?: number;
    totalAmount?: number;
    upiIntentUrl?: string;
    message?: string;
  }> {
    const res = await apiClient.get(`/payments/order/${orderId}/upi`);
    return res.data;
  },

  async submitUtr(orderId: string, utr: string, payerApp?: string): Promise<{ success: boolean; message: string; order?: any }> {
    const res = await apiClient.post('/payments/record-direct-upi', {
      orderId,
      upiRefNumber: utr,
      upiPayerApp: payerApp || 'Mobile UPI App',
    });
    return res.data;
  },

  async getPaymentDetails(orderId: string): Promise<{ success: boolean; order: any; payment: any }> {
    const res = await apiClient.get(`/payments/order/${orderId}`);
    return res.data;
  },
};

// ============================================================================
// CROP HEALTH / AI LEAF SCANNER API
// ============================================================================
export const cropHealthApi = {
  async analyzeImage(
    imageUri: string,
    fileName?: string,
    mimeType?: string
  ): Promise<AnalyzeCropResponse> {
    const cleanFileName = fileName || `leaf_${Date.now()}.jpg`;
    const cleanType = mimeType || 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: cleanFileName,
      type: cleanType,
    } as any);

    const res = await apiClient.post<AnalyzeCropResponse>('/crop-health/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async getHistory(): Promise<PredictionHistoryResponse> {
    const res = await apiClient.get<PredictionHistoryResponse>('/crop-health/history');
    return res.data;
  },

  async getPredictionById(id: string): Promise<{ success: boolean; analysis: CropAnalysis }> {
    const res = await apiClient.get<{ success: boolean; analysis: CropAnalysis }>(`/crop-health/history/${id}`);
    return res.data;
  },

  async deletePrediction(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/crop-health/history/${id}`);
    return res.data;
  },
};

// ============================================================================
// WEATHER API (HYPER-LOCAL AGROMET DATA)
// ============================================================================
export const weatherApi = {
  async getLiveWeather(params?: { lat?: number; lon?: number; district?: string; state?: string }): Promise<any> {
    const res = await apiClient.get('/weather/current', { params });
    return res.data;
  },

  async getWeatherForecast(params?: { lat?: number; lon?: number; district?: string; state?: string }): Promise<any> {
    const res = await apiClient.get('/weather/forecast', { params });
    return res.data;
  },
};

// ============================================================================
// MANDI PRICES API (REAL APMC MARKET YARDS)
// ============================================================================
export const mandiPricesApi = {
  async getPrices(params?: { state?: string; district?: string; market?: string; commodity?: string; limit?: number; refresh?: boolean }): Promise<any> {
    const res = await apiClient.get('/mandi-prices', { params });
    return res.data;
  },

  async getMarketIntelligence(params: { commodity: string; state?: string; district?: string }): Promise<any> {
    const res = await apiClient.get('/mandi-prices/intelligence', { params });
    return res.data;
  },
};

// ============================================================================
// GOVERNMENT SCHEMES API (OFFICIAL PORTAL VERIFIED)
// ============================================================================
export const schemesApi = {
  async getSchemes(params?: { category?: string; state?: string; search?: string }): Promise<any> {
    const res = await apiClient.get('/schemes', { params });
    return res.data;
  },

  async getSchemeById(id: string): Promise<any> {
    const res = await apiClient.get(`/schemes/${id}`);
    return res.data;
  },

  async getCategories(): Promise<any> {
    const res = await apiClient.get('/schemes/categories');
    return res.data;
  },
};


