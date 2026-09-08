import axios from 'axios';
import { Capacitor } from '@capacitor/core';
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

export const getApiBaseUrl = (): string => {
  // 1. Production bundle or Native Mobile Runtime (Android / iOS): ALWAYS route to production HTTPS backend
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const isCapacitorScheme = typeof window !== 'undefined' && window.location && (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  );

  if (import.meta.env?.PROD || isNative || isCapacitorScheme) {
    const envUrl = (import.meta.env?.VITE_PRODUCTION_API_URL || import.meta.env?.VITE_API_URL || '').trim();
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      const cleanUrl = envUrl.replace(/\/+$/, '');
      return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    }
    return 'https://agromitra-ytqb.onrender.com/api';
  }

  // 2. Local development runtime in desktop browser (npm run dev on port 5173): talk to local backend on port 5000
  if (import.meta.env?.DEV && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return `http://${hostname}:5000/api`;
    }
  }

  // 3. Fallback
  return 'https://agromitra-ytqb.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Attach dynamic baseURL and Authorization header
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
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


// Auto-handle 401 Unauthorized across all requests
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('agrimart_token');
      localStorage.removeItem('agrimart_user');
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
  const response = await apiClient.get<{ status: string; service: string }>('/crop-health/health');
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
  smsConfigured?: boolean;
}

export const forgotPasswordApi = async (
  identifier: string | { email?: string; phone?: string }
): Promise<ForgotPasswordResponse> => {
  let payload: { email?: string; phone?: string };
  if (typeof identifier === 'string') {
    const clean = identifier.trim().replace(/^(\+91|0)/, '');
    if (/^\d{10}$/.test(clean)) {
      payload = { phone: clean };
    } else {
      payload = { email: identifier.trim() };
    }
  } else {
    payload = identifier;
  }
  const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', payload);
  return response.data;
};

export interface ResetPasswordPayload {
  token?: string;
  newPassword: string;
  email?: string;
  phone?: string;
}

export const resetPasswordApi = async (
  payload: ResetPasswordPayload | string,
  legacyNewPassword?: string
): Promise<{ success: boolean; message: string }> => {
  let body: ResetPasswordPayload;
  if (typeof payload === 'string') {
    const clean = payload.trim().replace(/^(\+91|0)/, '');
    if (/^\d{10}$/.test(clean)) {
      body = { phone: clean, newPassword: legacyNewPassword || '' };
    } else {
      body = { email: payload, newPassword: legacyNewPassword || '' };
    }
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

// Payment API endpoints (Razorpay & Store UPI)
export const getStorePaymentConfigApi = async (): Promise<import('../types/payment').StorePaymentConfigResponse> => {
  const response = await apiClient.get<import('../types/payment').StorePaymentConfigResponse>(
    '/payments/store-config'
  );
  return response.data;
};

export const updateStorePaymentConfigApi = async (
  data: import('../types/payment').StorePaymentConfig
): Promise<import('../types/payment').StorePaymentConfigResponse> => {
  const response = await apiClient.put<import('../types/payment').StorePaymentConfigResponse>(
    '/payments/store-config',
    data
  );
  return response.data;
};

export const deleteStorePaymentConfigApi = async (): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    '/payments/store-config'
  );
  return response.data;
};

export const getOrderUpiDetailsApi = async (
  orderId: string
): Promise<import('../types/payment').OrderUpiDetailsResponse> => {
  const response = await apiClient.get<import('../types/payment').OrderUpiDetailsResponse>(
    `/payments/order/${orderId}/upi`
  );
  return response.data;
};

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

export const getAdminPaymentsApi = async (): Promise<import('../types/payment').AdminPaymentsResponse> => {
  const response = await apiClient.get<import('../types/payment').AdminPaymentsResponse>(
    '/payments/admin/all'
  );
  return response.data;
};

export const verifyAdminPaymentApi = async (
  orderId: string,
  status: 'PAID' | 'FAILED',
  notes?: string
): Promise<{ success: boolean; message: string; order: any }> => {
  const response = await apiClient.post<{ success: boolean; message: string; order: any }>(
    '/payments/admin/verify-upi',
    { orderId, status, notes }
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

// Live Weather API endpoints
export const getLiveWeatherApi = async (
  params?: import('../types/weather').WeatherQueryParams
): Promise<import('../types/weather').WeatherResponse> => {
  const response = await apiClient.get<import('../types/weather').WeatherResponse>('/weather', {
    params,
  });
  return response.data;
};

export const getCurrentWeatherApi = async (
  districtOrParams?: string | import('../types/weather').WeatherQueryParams,
  state?: string
): Promise<import('../types/weather').WeatherResponse> => {
  const params =
    typeof districtOrParams === 'object'
      ? districtOrParams
      : { district: districtOrParams, state };
  const response = await apiClient.get<import('../types/weather').WeatherResponse>('/weather/current', {
    params,
  });
  return response.data;
};

export const getWeatherForecastApi = async (
  districtOrParams?: string | import('../types/weather').WeatherQueryParams,
  state?: string
): Promise<import('../types/weather').WeatherResponse> => {
  const params =
    typeof districtOrParams === 'object'
      ? districtOrParams
      : { district: districtOrParams, state };
  const response = await apiClient.get<import('../types/weather').WeatherResponse>('/weather/forecast', {
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

// ==========================================
// Pincode Auto-Fill & GPS Location APIs
// ==========================================
export const lookupPincodeApi = async (
  pincode: string
): Promise<import('../types/location').PincodeLookupResponse> => {
  const response = await apiClient.get<import('../types/location').PincodeLookupResponse>(
    `/location/pincode/${pincode}`
  );
  return response.data;
};

export const validateCoordinatesApi = async (params: {
  latitude: number;
  longitude: number;
}): Promise<import('../types/location').CoordinateValidationResponse> => {
  const response = await apiClient.post<import('../types/location').CoordinateValidationResponse>(
    '/location/validate',
    params
  );
  return response.data;
};

export const reverseGeocodeApi = async (params: {
  lat: number;
  lon: number;
}): Promise<import('../types/location').ReverseGeocodeResponse> => {
  const response = await apiClient.get<import('../types/location').ReverseGeocodeResponse>(
    '/location/reverse-geocode',
    { params }
  );
  return response.data;
};

// ==========================================
// Market Owner & Daily Mandi Price APIs
// ==========================================
export const getMarketOwnerDashboardApi = async (): Promise<
  import('../types/marketOwner').MarketOwnerDashboardData
> => {
  const response = await apiClient.get<import('../types/marketOwner').MarketOwnerDashboardData>(
    '/market-owner/dashboard'
  );
  return response.data;
};

export const getMyMarketApi = async (): Promise<{
  success: boolean;
  market: import('../types/marketOwner').Market;
}> => {
  const response = await apiClient.get<{
    success: boolean;
    market: import('../types/marketOwner').Market;
  }>('/market-owner/my-market');
  return response.data;
};

export const updateMyMarketApi = async (
  data: Partial<import('../types/marketOwner').Market>
): Promise<{
  success: boolean;
  message: string;
  market: import('../types/marketOwner').Market;
}> => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    market: import('../types/marketOwner').Market;
  }>('/market-owner/my-market', data);
  return response.data;
};

export const addOrUpdateMarketPriceApi = async (
  payload: import('../types/marketOwner').AddPricePayload
): Promise<{
  success: boolean;
  marketPrice: import('../types/marketOwner').MarketPriceRecord;
  audit: import('../types/marketOwner').PriceAuditRecord;
  message: string;
}> => {
  const response = await apiClient.post<{
    success: boolean;
    marketPrice: import('../types/marketOwner').MarketPriceRecord;
    audit: import('../types/marketOwner').PriceAuditRecord;
    message: string;
  }>('/market-owner/prices', payload);
  return response.data;
};

export const getCommoditiesApi = async (params?: {
  category?: string;
  search?: string;
  includeInactive?: boolean;
}): Promise<{
  success: boolean;
  count: number;
  commodities: import('../types/marketOwner').Commodity[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    commodities: import('../types/marketOwner').Commodity[];
  }>('/market-owner/commodities', { params });
  return response.data;
};

export const createCommodityApi = async (data: {
  name: string;
  category: string;
  variety?: string;
  defaultUnit?: string;
  allowedUnits?: string[];
  icon?: string;
}): Promise<{
  success: boolean;
  message: string;
  commodity: import('../types/marketOwner').Commodity;
}> => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    commodity: import('../types/marketOwner').Commodity;
  }>('/market-owner/commodities', data);
  return response.data;
};

export const updateCommodityApi = async (
  id: string,
  data: Partial<import('../types/marketOwner').Commodity>
): Promise<{
  success: boolean;
  message: string;
  commodity: import('../types/marketOwner').Commodity;
}> => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    commodity: import('../types/marketOwner').Commodity;
  }>(`/market-owner/commodities/${id}`, data);
  return response.data;
};

export const getMarketPricesTodayApi = async (params?: {
  state?: string;
  district?: string;
  marketId?: string;
  commodity?: string;
  date?: string;
}): Promise<{
  success: boolean;
  date: string;
  totalRecords: number;
  records: import('../types/marketOwner').MarketPriceRecord[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    date: string;
    totalRecords: number;
    records: import('../types/marketOwner').MarketPriceRecord[];
  }>('/market-owner/prices/today', { params });
  return response.data;
};

export const getMarketPriceHistoryApi = async (params: {
  commodityId?: string;
  commodity?: string;
  marketId?: string;
  days?: number;
}): Promise<import('../types/marketOwner').MarketPriceHistoryData> => {
  const response = await apiClient.get<import('../types/marketOwner').MarketPriceHistoryData>(
    '/market-owner/prices/history',
    { params }
  );
  return response.data;
};

export const compareNearbyMarketsApi = async (params: {
  commodityId?: string;
  commodity?: string;
  lat?: number;
  lon?: number;
}): Promise<import('../types/marketOwner').MarketComparisonResponse> => {
  const response = await apiClient.get<import('../types/marketOwner').MarketComparisonResponse>(
    '/market-owner/prices/compare',
    { params }
  );
  return response.data;
};

// ==========================================
// Admin Governance APIs (Market Owners & Audits)
// ==========================================
export const getAdminMarketsApi = async (): Promise<{
  success: boolean;
  count: number;
  markets: import('../types/marketOwner').Market[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    markets: import('../types/marketOwner').Market[];
  }>('/market-owner/admin/markets');
  return response.data;
};

export const getAdminMarketOwnersApi = async (): Promise<{
  success: boolean;
  count: number;
  owners: User[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    owners: User[];
  }>('/market-owner/admin/owners');
  return response.data;
};

export const updateAdminMarketOwnerStatusApi = async (
  ownerId: string,
  status: 'ACTIVE' | 'PENDING' | 'DISABLED',
  isApproved?: boolean
): Promise<{ success: boolean; message: string; user: User }> => {
  const response = await apiClient.put<{ success: boolean; message: string; user: User }>(
    `/market-owner/admin/owners/${ownerId}/status`,
    { status, isApproved }
  );
  return response.data;
};

export const assignAdminMarketOwnerApi = async (
  marketId: string,
  ownerId: string
): Promise<{ success: boolean; message: string; market: import('../types/marketOwner').Market }> => {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    market: import('../types/marketOwner').Market;
  }>('/market-owner/admin/markets/assign', { marketId, ownerId });
  return response.data;
};

export const getAdminPriceAuditsApi = async (params?: {
  marketId?: string;
  commodityId?: string;
  suspicious?: boolean;
  limit?: number;
}): Promise<{
  success: boolean;
  count: number;
  audits: import('../types/marketOwner').PriceAuditRecord[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    count: number;
    audits: import('../types/marketOwner').PriceAuditRecord[];
  }>('/market-owner/admin/audits', { params });
  return response.data;
};

// ----------------------------------------------------------------------------
// In-App Notifications & Price Alerts API
// ----------------------------------------------------------------------------
export interface AppNotification {
  _id: string;
  type: 'PRICE_ALERT' | 'WEATHER_ALERT' | 'ORDER_ALERT' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export const getNotificationsApi = async (limit = 20): Promise<{
  success: boolean;
  unreadCount: number;
  notifications: AppNotification[];
}> => {
  const response = await apiClient.get<{
    success: boolean;
    unreadCount: number;
    notifications: AppNotification[];
  }>('/notifications', { params: { limit } });
  return response.data;
};

export const markNotificationReadApi = async (id: string): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
  }>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsReadApi = async (): Promise<{
  success: boolean;
  markedCount: number;
  message: string;
}> => {
  const response = await apiClient.patch<{
    success: boolean;
    markedCount: number;
    message: string;
  }>('/notifications/read-all');
  return response.data;
};









