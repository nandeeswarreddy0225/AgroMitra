import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AppTabs } from './AppTabs';
import { ProductDetailScreen } from '../screens/marketplace/ProductDetailScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { PaymentScreen } from '../screens/payment/PaymentScreen';
import { LeafScannerScreen } from '../screens/scanner/LeafScannerScreen';
import { ScannerResultScreen } from '../screens/scanner/ScannerResultScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Starting AgriMart..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="LeafScanner"
        component={LeafScannerScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ScannerResult"
        component={ScannerResultScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};
