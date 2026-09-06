export const PRODUCT_CATEGORIES = [
  'Seeds',
  'Fertilizers',
  'Bio-Fertilizers',
  'Soil Conditioners',
  'Growth Promoters',
  'Pesticides',
  'Insecticides',
  'Fungicides',
  'Herbicides',
  'Bio Products',
  'Crop Protection Products',
  'Agricultural Equipment',
  'Irrigation Equipment',
  'Tools & Machinery',
  'Animal Feed',
] as const;

export type StandardProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductCategory = StandardProductCategory | string;

export interface ProductAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ShopOwnerInfo {
  id?: string;
  _id?: string;
  name: string;
  shopName?: string;
  upiId?: string;
  email: string;
  phone: string;
  address?: ProductAddress;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  description: string;
  category: ProductCategory;
  brand: string;
  price: number;
  unit: string;
  stock: number;
  images: string[];
  shopOwner: ShopOwnerInfo | string;
  location?: ProductAddress;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryParams {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'createdAt' | 'name' | 'stock';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  products: Product[];
}

export interface SingleProductResponse {
  success: boolean;
  product: Product;
  message?: string;
}
