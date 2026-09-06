import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Store, ShoppingBag, Package, User } from 'lucide-react-native';
import { MainTabParamList } from '../types/navigation';
import { FarmerHomeScreen } from '../screens/home/FarmerHomeScreen';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { useCart } from '../context/CartContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const AppTabs: React.FC = () => {
  const { totalItems } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#047857', // Emerald 700
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={FarmerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="MarketplaceTab"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => <Store size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: totalItems > 0 ? (totalItems > 99 ? '99+' : totalItems) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#047857',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <Package size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
