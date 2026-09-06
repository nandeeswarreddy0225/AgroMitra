import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Package, Calendar, Clock, ArrowRight } from 'lucide-react-native';
import { ordersApi } from '../../services/api';
import { Order } from '../../types/order';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const OrdersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await ordersApi.getMyOrders();
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header title="My Orders" />
        <EmptyState
          title="Sign in to View Orders"
          description="Log in to track your agricultural orders, delivery status, and payment receipts."
          icon={<Package size={48} color="#047857" />}
          actionTitle="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'success';
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED':
      case 'PROCESSING':
        return 'info';
      case 'PENDING':
      case 'ACCEPTED':
        return 'warning';
      case 'CANCELLED':
      case 'REJECTED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      <Header title="My Orders" subtitle="Track deliveries & payment status" />

      {isLoading ? (
        <LoadingSpinner message="Fetching your orders..." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={13} color="#6b7280" />
                    <Text style={styles.dateText}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <Badge label={item.status} variant={getStatusVariant(item.status)} />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.itemsSummary}>
                  {item.items?.length || 0} {(item.items?.length || 0) === 1 ? 'item' : 'items'} •{' '}
                  {item.items?.map((it) => it.productNameSnapshot || 'Product').join(', ')}
                </Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Order Total</Text>
                    <Text style={styles.totalAmount}>₹{item.totalAmount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.paymentBadge}>
                    <Text
                      style={[
                        styles.paymentText,
                        item.paymentStatus === 'PAID' ? styles.paidText : styles.pendingText,
                      ]}
                    >
                      {item.paymentStatus === 'PAID' ? '● Paid' : '○ Payment Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No Orders Placed Yet"
              description="You have not placed any orders. Start by exploring our seeds and fertilizer catalog."
              icon={<Package size={48} color="#9ca3af" />}
              actionTitle="Browse Marketplace"
              onAction={() => navigation.navigate('MarketplaceTab')}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchOrders();
              }}
              colors={['#047857']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardBody: {
    paddingTop: 2,
  },
  itemsSummary: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#047857',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paidText: {
    color: '#047857',
  },
  pendingText: {
    color: '#d97706',
  },
});
