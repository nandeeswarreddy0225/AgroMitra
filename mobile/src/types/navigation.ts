import { NavigatorScreenParams } from '@react-navigation/native';
import { Product } from './product';
import { Order } from './order';
import { CropAnalysis } from './cropHealth';

export type MainTabParamList = {
  HomeTab: undefined;
  MarketplaceTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetail: { productId: string; product?: Product };
  Cart: undefined;
  Checkout: undefined;
  Payment: { orderId: string; orderNumber?: string; totalAmount?: number };
  Login: undefined;
  Register: undefined;
  OrderDetail: { orderId: string; order?: Order };
  LeafScanner: undefined;
  ScannerResult: { analysis: CropAnalysis; imageUri?: string };
};

