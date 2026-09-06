import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/auth';

const TOKEN_KEY = 'agrimart_mobile_token';
const USER_KEY = 'agrimart_mobile_user';

export const storage = {
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  async saveUser(user: User): Promise<void> {
    const json = JSON.stringify(user);
    await AsyncStorage.setItem(USER_KEY, json);
  },

  async getUser(): Promise<User | null> {
    try {
      const json = await AsyncStorage.getItem(USER_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  },
};
