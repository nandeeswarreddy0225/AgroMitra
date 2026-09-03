export const PRODUCT_CATEGORIES = [
  'Seeds',
  'Pesticides',
  'Insecticides',
  'Fungicides',
  'Herbicides',
  'Bio Products',
  'Crop Protection Products',
  'Agricultural Equipment',
] as const;


export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  category: ProductCategory;
  brand?: string;
  price: number;
  unit: string;
  stock: number;
  image?: string;
  images?: string[];
  location?: ProductAddress;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: ProductCategory;
  brand?: string;
  price?: number;
  unit?: string;
  stock?: number;
  image?: string;
  images?: string[];
  location?: ProductAddress;
}

export interface ProductQueryParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  limit?: number;
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  products: Product[];
}

export interface SingleProductResponse {
  success: boolean;
  product: Product;
  message?: string;
}

export type CreateProductData = CreateProductInput;

