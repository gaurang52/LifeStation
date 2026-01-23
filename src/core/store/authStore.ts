import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { User } from '@core/types';
import { authApi } from '@core/api/authApi';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string, fcmToken?: string) => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    user_type: 'ADMIN' | 'SUPER_ADMIN' | 'caregiver' | 'senior';
    mobile?: string;
    address?: string;
    gender?: string;
    fcm_token?: string;
    privacy_accepted: boolean;
    terms_accepted: boolean;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      login: async (email: string, password: string, fcmToken?: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({
            email,
            password,
            fcm_token: fcmToken,
            platform: Platform.OS,
          });
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      signup: async payload => {
        set({ isLoading: true });
        try {
          const response = await authApi.signup({
            ...payload,
            fcm_token: payload.fcm_token,
            platform: Platform.OS,
          });
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
      setToken: (token: string) => {
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          useAuthStore.setState({ _hasHydrated: true });
        } else {
          // Even if there's an error, mark as hydrated so app can continue
          useAuthStore.setState({ _hasHydrated: true });
        }
      },
    },
  ),
);
