import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { User, Phone, Mail, MapPin, Shield, LogOut, Sprout } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <Header title="Farmer Profile" />
        <EmptyState
          title="Sign in to Your Account"
          description="Log in to view your profile details, registered farm address, and order history."
          icon={<User size={48} color="#047857" />}
          actionTitle="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of AgriMart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Farmer Profile" subtitle="Account & Farm Location Settings" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'F'}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.roleRow}>
            <Badge label={user.role || 'FARMER'} variant="success" />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardHeading}>Account Information</Text>

          <View style={styles.detailRow}>
            <Phone size={18} color="#047857" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>{user.phone || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Mail size={18} color="#047857" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <MapPin size={18} color="#047857" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Farm & Delivery Location</Text>
              <Text style={styles.detailValue}>
                {user.address?.street ? `${user.address.street}, ` : ''}
                {user.address?.city || 'Anantapur'}, {user.address?.state || 'Andhra Pradesh'}{' '}
                {user.address?.pincode ? `(${user.address.pincode})` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* App Info Card */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Sprout size={20} color="#047857" />
            <Text style={styles.aboutTitle}>AgriMart Mobile v1.0.0</Text>
          </View>
          <Text style={styles.aboutTagline}>Smart Farming • Better Decisions • Stronger Connections</Text>
          <Text style={styles.aboutDescription}>
            Connected directly to AgriMart Production Cloud and verified Andhra Pradesh Retail Hubs.
          </Text>
        </View>

        {/* Logout Button */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          size="large"
          style={styles.logoutBtn}
          icon={<LogOut size={18} color="#047857" />}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  roleRow: {
    marginTop: 6,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  aboutCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
  },
  aboutTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 6,
  },
  aboutDescription: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 16,
  },
  logoutBtn: {
    marginTop: 4,
  },
});
