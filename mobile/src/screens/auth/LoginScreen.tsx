import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, Phone, Lock, Mail } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!identifier.trim()) {
      setErrorMsg(loginMethod === 'phone' ? 'Please enter your phone number' : 'Please enter your email');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    try {
      if (loginMethod === 'phone') {
        await login({ phone: identifier.trim(), password });
      } else {
        await login({ email: identifier.trim().toLowerCase(), password });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setErrorMsg(msg);
      Alert.alert('Login Failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Sprout size={36} color="#047857" />
          </View>
          <Text style={styles.brandTitle}>AgriMart</Text>
          <Text style={styles.tagline}>Smart Farming • Better Decisions • Stronger Connections</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your farmer account</Text>

          {/* Toggle Phone / Email */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, loginMethod === 'phone' && styles.activeToggle]}
              onPress={() => {
                setLoginMethod('phone');
                setIdentifier('');
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.toggleText, loginMethod === 'phone' && styles.activeToggleText]}>
                Phone Number
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, loginMethod === 'email' && styles.activeToggle]}
              onPress={() => {
                setLoginMethod('email');
                setIdentifier('');
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.toggleText, loginMethod === 'email' && styles.activeToggleText]}>
                Email Address
              </Text>
            </TouchableOpacity>
          </View>

          {loginMethod === 'phone' ? (
            <Input
              label="Phone Number"
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={identifier}
              onChangeText={setIdentifier}
              leftIcon={<Phone size={18} color="#047857" />}
              autoCapitalize="none"
            />
          ) : (
            <Input
              label="Email Address"
              placeholder="farmer@agrimart.com"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
              leftIcon={<Mail size={18} color="#047857" />}
              autoCapitalize="none"
            />
          )}

          <Input
            label="Password"
            placeholder="Enter your password"
            isPassword
            value={password}
            onChangeText={setPassword}
            leftIcon={<Lock size={18} color="#047857" />}
          />

          {errorMsg ? <Text style={styles.formError}>{errorMsg}</Text> : null}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            size="large"
            style={styles.loginBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register as Farmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#022c22', // AgriMart Dark Forest Emerald
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#a7f3d0',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeToggleText: {
    color: '#047857',
    fontWeight: '700',
  },
  formError: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  registerLink: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
});
