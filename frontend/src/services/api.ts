import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterData, User, UpdateProfileData } from '../types/auth';
import {
  CreateProductInput,
  ProductQueryParams,
  ProductsResponse,
  SingleProductResponse,
  UpdateProductInput,
} from '../types/product';
import { AddToCartInput, CartResponse } from '../types/cart';
import {
  CreateOrderInput,
  OrdersResponse,
  ShopOwnerOrdersResponse,
  SingleOrderResponse,
} from '../types/order';

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env?.VITE_API_URL || '').trim();
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Attach Authorization header if token exists in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agrimart_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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


// Auto-handle 401 Unauthorized across protected requests
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Clear credentials if token expired or invalid
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('agrimart_token');
        localStorage.removeItem('agrimart_user');
      }
    }
    return Promise.reject(error);
  }
);

export interface HealthResponse {
  success: boolean;
  message: string;
}

export const checkBackendHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
};

export const checkAIServiceHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await axios.get('http://localhost:8000/health', { timeout: 10000 });
  return response.data;
};

// Auth API endpoints
export const registerApi = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return response.data;
};

export const getMeApi = async (): Promise<{ success: boolean; user: User }> => {
  const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
  return response.data;
};

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  resetLink?: string;
  expiresInMinutes?: number;
  smtpConfigured?: boolean;
}

export const forgotPasswordApi = async (email: string): Promise<ForgotPasswordResponse> => {
  const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
  return response.data;
};

export interface ResetPasswordPayload {
  token?: string;
  newPassword: string;
  email?: string;
}

export const resetPasswordApi = async (
  payload: ResetPasswordPayload | string,
  legacyNewPassword?: string
): Promise<{ success: boolean; message: string }> => {
  let body: ResetPasswordPayload;
  if (typeof payload === 'string') {
    body = { email: payload, newPassword: legacyNewPassword || '' };
  } else {
    body = payload;
  }
  const response = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', body);
  return response.data;
};

export const updateProfileApi = async (
  data: UpdateProfileData
): Promise<{ success: boolean; message: string; user: User }> => {
  const response = await apiClient.put<{ success: boolean; message: string; user: User }>(
    '/auth/profile',
    data
  );
  return response.data;
};

// Product API endpoints
export const getProductsApi = async (params?: ProductQueryParams): Promise<ProductsResponse> => {
  const response = await apiClient.get<ProductsResponse>('/products', { params });
  return response.data;
};

export const getMyProductsApi = async (): Promise<ProductsResponse> => {
  const response = await apiClient.get<ProductsResponse>('/products/my');
  return response.data;
};

export const getProductByIdApi = async (id: string): Promise<SingleProductResponse> => {
  const response = await apiClient.get<SingleProductResponse>(`/products/${id}`);
  return response.data;
};

export const createProductApi = async (
  data: CreateProductInput
): Promise<SingleProductResponse> => {
  const response = await apiClient.post<SingleProductResponse>('/products', data);
  return response.data;
};

export const updateProductApi = async (
  id: string,
  data: UpdateProductInput
): Promise<SingleProductResponse> => {
  const response = await apiClient.put<SingleProductResponse>(`/products/${id}`, data);
  return response.data;
};

export const deleteProductApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/products/${id}`);
  return response.data;
};

// Cart API endpoints (Farmer only)
export const getCartApi = async (): Promise<CartResponse> => {
  const response = await apiClient.get<CartResponse>('/cart');
  return response.data;
};

export const addToCartApi = async (data: AddToCartInput): Promise<CartResponse> => {
  const response = await apiClient.post<CartResponse>('/cart/items', data);
  return response.data;
};

export const updateCartItemQuantityApi = async (
  productId: string,
  quantity: number
): Promise<CartResponse> => {
  const response = await apiClient.put<CartResponse>(`/cart/items/${productId}`, { quantity });
  return response.data;
};

export const removeCartItemApi = async (productId: string): Promise<CartResponse> => {
  const response = await apiClient.delete<CartResponse>(`/cart/items/${productId}`);
  return response.data;
};

export const clearCartApi = async (): Promise<CartResponse> => {
  const response = await apiClient.delete<CartResponse>('/cart');
  return response.data;
};

// Order API endpoints
export const createOrderApi = async (data: CreateOrderInput): Promise<SingleOrderResponse> => {
  const response = await apiClient.post<SingleOrderResponse>('/orders', data);
  return response.data;
};

export const getFarmerOrdersApi = async (): Promise<OrdersResponse> => {
  const response = await apiClient.get<OrdersResponse>('/orders');
  return response.data;
};

export const getShopOwnerOrdersApi = async (): Promise<ShopOwnerOrdersResponse> => {
  const response = await apiClient.get<ShopOwnerOrdersResponse>('/orders/shop-owner');
  return response.data;
};

export const getOrderByIdApi = async (id: string): Promise<SingleOrderResponse> => {
  const response = await apiClient.get<SingleOrderResponse>(`/orders/${id}`);
  return response.data;
};

export const cancelOrderApi = async (id: string): Promise<SingleOrderResponse> => {
  const response = await apiClient.put<SingleOrderResponse>(`/orders/${id}/cancel`);
  return response.data;
};

export const updateOrderStatusApi = async (
  id: string,
  status: import('../types/order').OrderStatus,
  rejectionReason?: string,
  message?: string,
  paymentStatus?: import('../types/order').OrderPaymentStatus
): Promise<SingleOrderResponse> => {
  const response = await apiClient.put<SingleOrderResponse>(`/orders/${id}/status`, {
    status,
    rejectionReason,
    message,
    paymentStatus,
  });
  return response.data;
};

// Payment API endpoints (Razorpay)
export const createPaymentOrderApi = async (
  orderId: string
): Promise<import('../types/payment').CreatePaymentOrderResponse> => {
  const response = await apiClient.post<import('../types/payment').CreatePaymentOrderResponse>(
    '/payments/create-order',
    { orderId }
  );
  return response.data;
};

export const verifyPaymentApi = async (
  payload: import('../types/payment').VerifyPaymentPayload
): Promise<import('../types/payment').VerifyPaymentResponse> => {
  const response = await apiClient.post<import('../types/payment').VerifyPaymentResponse>(
    '/payments/verify',
    payload
  );
  return response.data;
};

export const getPaymentDetailsApi = async (
  orderId: string
): Promise<{ success: boolean; order: any; payment: any }> => {
  const response = await apiClient.get<{ success: boolean; order: any; payment: any }>(
    `/payments/order/${orderId}`
  );
  return response.data;
};

export const recordDirectUpiPaymentApi = async (
  orderId: string,
  upiRefNumber?: string,
  upiPayerApp?: string
): Promise<{ success: boolean; message: string; order: any }> => {
  const response = await apiClient.post<{ success: boolean; message: string; order: any }>(
    '/payments/direct-upi',
    { orderId, upiRefNumber, upiPayerApp }
  );
  return response.data;
};

// Government Schemes API endpoints
export const getSchemesApi = async (
  params?: import('../types/scheme').SchemeQueryParams
): Promise<import('../types/scheme').SchemesResponse> => {
  const response = await apiClient.get<import('../types/scheme').SchemesResponse>('/schemes', {
    params,
  });
  return response.data;
};

export const getSchemeByIdApi = async (
  id: string
): Promise<import('../types/scheme').SingleSchemeResponse> => {
  const response = await apiClient.get<import('../types/scheme').SingleSchemeResponse>(
    `/schemes/${id}`
  );
  return response.data;
};

export const getSchemeCategoriesApi = async (): Promise<
  import('../types/scheme').SchemeCategoriesResponse
> => {
  const response = await apiClient.get<import('../types/scheme').SchemeCategoriesResponse>(
    '/schemes/categories'
  );
  return response.data;
};

// AI Crop Disease Detection API endpoints
export const analyzeCropImageApi = async (
  file: File
): Promise<import('../types/cropHealth').AnalyzeCropResponse> => {
  const formData = new FormData();
  formData.append('image', file, file.name || `leaf-scan-${Date.now()}.jpg`);


  const token = localStorage.getItem('agrimart_token');
  const response = await apiClient.post<import('../types/cropHealth').AnalyzeCropResponse>(
    '/crop-health/analyze',
    formData,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000,
    }
  );
  return response.data;
};

export const getCropAnalysisHistoryApi = async (): Promise<
  import('../types/cropHealth').PredictionHistoryResponse
> => {
  const response = await apiClient.get<import('../types/cropHealth').PredictionHistoryResponse>(
    '/crop-health/history'
  );
  return response.data;
};

export const deleteCropAnalysisApi = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/crop-health/history/${id}`
  );
  return response.data;
};

// Delivery Boy API endpoints
export const getShopDeliveryBoysApi = async (): Promise<
  import('../types/delivery').ShopDeliveryBoysResponse
> => {
  const response = await apiClient.get<import('../types/delivery').ShopDeliveryBoysResponse>(
    '/delivery/shop-delivery-boys'
  );
  return response.data;
};

export const createShopDeliveryBoyApi = async (
  data: import('../types/delivery').CreateDeliveryBoyInput
): Promise<{ success: boolean; message: string; deliveryBoy: import('../types/delivery').DeliveryBoy }> => {
  const response = await apiClient.post<{ success: boolean; message: string; deliveryBoy: import('../types/delivery').DeliveryBoy }>(
    '/delivery/create',
    data
  );
  return response.data;
};

export const assignDeliveryBoyToOrderApi = async (
  payload: import('../types/delivery').AssignDeliveryBoyInput
): Promise<{ success: boolean; message: string; order: import('../types/order').Order }> => {
  const response = await apiClient.post<{ success: boolean; message: string; order: import('../types/order').Order }>(
    '/delivery/assign-order',
    payload
  );
  return response.data;
};

export const getDeliveryBoyAssignedOrdersApi = async (): Promise<{
  success: boolean;
  count: number;
  orders: any[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    orders: any[];
  }>('/delivery/assigned-orders');
  return response.data;
};

export const respondToDeliveryAssignmentApi = async (
  orderId: string,
  payload: import('../types/delivery').RespondDeliveryInput
): Promise<{ success: boolean; message: string; order: any }> => {
  const response = await apiClient.post<{ success: boolean; message: string; order: any }>(
    `/delivery/orders/${orderId}/respond`,
    payload
  );
  return response.data;
};

export const updateDeliveryStatusApi = async (
  orderId: string,
  status: import('../types/delivery').DeliveryStatus,
  note?: string
): Promise<{ success: boolean; message: string; order: any }> => {
  const response = await apiClient.patch<{ success: boolean; message: string; order: any }>(
    `/delivery/orders/${orderId}/status`,
    { status, note }
  );
  return response.data;
};


export const getGovernmentSchemesApi = getSchemesApi;
export const getDeliveryBoyOrdersApi = getDeliveryBoyAssignedOrdersApi;
export const getShopOwnerProductsApi = getMyProductsApi;

// Live Weather API endpoint
export const getLiveWeatherApi = async (
  params?: import('../types/weather').WeatherQueryParams
): Promise<import('../types/weather').WeatherResponse> => {
  const response = await apiClient.get<import('../types/weather').WeatherResponse>('/weather', {
    params,
  });
  return response.data;
};

// Seasonal Crop Advisor API endpoints
export const getSeasonalCropsApi = async (
  params?: import('../types/cropAdvisor').SeasonalCropQueryParams
): Promise<import('../types/cropAdvisor').SeasonalAdvisorResponse> => {
  const response = await apiClient.get<import('../types/cropAdvisor').SeasonalAdvisorResponse>(
    '/crop-advisor',
    { params }
  );
  return response.data;
};

export const generateCropPlanApi = async (payload: {
  cropId: string;
  soilType: string;
  soilTest?: import('../types/cropAdvisor').ISoilTest;
  season?: string;
  state?: string;
  city?: string;
  temperature?: number;
  rainProbability?: number;
}): Promise<{ success: boolean; plan: import('../types/cropAdvisor').FullCropPlanResult; message?: string }> => {
  const response = await apiClient.post<{
    success: boolean;
    plan: import('../types/cropAdvisor').FullCropPlanResult;
    message?: string;
  }>('/crop-advisor/generate-plan', payload);
  return response.data;
};

export const saveFarmerCropPlanApi = async (
  payload: import('../types/cropAdvisor').SaveCropPlanPayload
): Promise<{ success: boolean; message: string; plan: any }> => {
  const response = await apiClient.post<{ success: boolean; message: string; plan: any }>(
    '/crop-advisor/my-plan',
    payload
  );
  return response.data;
};

export const getFarmerCropPlanApi = async (): Promise<{
  success: boolean;
  plan: any;
  message?: string;
}> => {
  const response = await apiClient.get<{
    success: boolean;
    plan: any;
    message?: string;
  }>('/crop-advisor/my-plan');
  return response.data;
};

// Official Mandi Prices API endpoint
export const getMandiPricesApi = async (
  params?: import('../types/mandiPrice').MandiPriceQueryParams
): Promise<import('../types/mandiPrice').MandiPriceResponse> => {
  const response = await apiClient.get<import('../types/mandiPrice').MandiPriceResponse>(
    '/mandi-prices',
    { params }
  );
  return response.data;
};

// AI Market Intelligence & Forecast API endpoint
export const getMarketIntelligenceApi = async (params: {
  commodity: string;
  state?: string;
  district?: string;
}): Promise<import('../types/mandiPrice').AIMarketIntelligenceResponse> => {
  const response = await apiClient.get<import('../types/mandiPrice').AIMarketIntelligenceResponse>(
    '/mandi-prices/intelligence',
    { params }
  );
  return response.data;
};









