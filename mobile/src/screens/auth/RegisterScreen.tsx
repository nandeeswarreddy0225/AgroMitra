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
import { Sprout, User as UserIcon, Phone, Lock, Mail, MapPin } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [city, setCity] = useState<string>('Anantapur');
  const [state, setState] = useState<string>('Andhra Pradesh');
  const [pincode, setPincode] = useState<string>('515001');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.trim().length !== 10) {
      setErrorMsg('Please enter a valid 10-digit phone number');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'FARMER',
        address: {
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setErrorMsg(msg);
      Alert.alert('Registration Failed', msg);
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
            <Sprout size={32} color="#047857" />
          </View>
          <Text style={styles.brandTitle}>Join AgriMart</Text>
          <Text style={styles.tagline}>Direct Agricultural Marketplace for Indian Farmers</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farmer Registration</Text>
          <Text style={styles.cardSubtitle}>Create your account for seed & fertilizer delivery</Text>

          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Reddy"
            value={name}
            onChangeText={setName}
            leftIcon={<UserIcon size={18} color="#047857" />}
          />

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            leftIcon={<Phone size={18} color="#047857" />}
          />

          <Input
            label="Email Address"
            placeholder="farmer@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leftIcon={<Mail size={18} color="#047857" />}
          />

          <Input
            label="Password"
            placeholder="At least 6 characters"
            isPassword
            value={password}
            onChangeText={setPassword}
            leftIcon={<Lock size={18} color="#047857" />}
          />

          <View style={styles.addressRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="City / District"
                placeholder="Anantapur"
                value={city}
                onChangeText={setCity}
                leftIcon={<MapPin size={16} color="#047857" />}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                label="Pincode"
                placeholder="515001"
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
              />
            </View>
          </View>

          {errorMsg ? <Text style={styles.formError}>{errorMsg}</Text> : null}

          <Button
            title="Create Farmer Account"
            onPress={handleRegister}
            loading={isLoading}
            size="large"
            style={styles.registerBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: '#022c22',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  tagline: {
    fontSize: 12,
    color: '#a7f3d0',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
  },
  formError: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  registerBtn: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
});
