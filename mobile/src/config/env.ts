import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  // Check EXPO_PUBLIC_API_URL if configured
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // Check Expo manifest extra config if available
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl && typeof extraUrl === 'string' && extraUrl.trim()) {
    const clean = extraUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // Auto-detect development machine LAN IP when running Expo Go on a physical phone
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && typeof hostUri === 'string' && hostUri.includes(':')) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000/api`;
    }
  }

  // Default backend API URL (Production Render HTTPS API)
  return 'https://agromitra-ytqb.onrender.com/api';
};

export const ENV = {
  API_BASE_URL: getBaseUrl(),
  TIMEOUT_MS: 30000,
  APP_NAME: 'AgriMart',
  TAGLINE: 'Smart Farming • Better Decisions • Stronger Connections',
};
