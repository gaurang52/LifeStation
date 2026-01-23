import { apiClient } from './client';
import type { User } from '@core/types';

export interface LoginRequest {
  email: string;
  password: string;
  fcm_token?: string;
  platform?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  refresh_token: string;
  user: User;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  user_type: 'ADMIN' | 'SUPER_ADMIN' | 'caregiver' | 'senior';
  mobile?: string;
  address?: string;
  gender?: string;
  fcm_token?: string;
  platform?: string;
  privacy_accepted: boolean;
  terms_accepted: boolean;
}

export interface SignupResponse {
  message: string;
  token: string;
  refresh_token: string;
  user: User;
}

/** Auth API matching backend routes exactly */
export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', payload);
    if (!res?.user || !res?.token) throw new Error('Invalid login response');
    return res;
  },

  async signup(payload: SignupRequest): Promise<SignupResponse> {
    const res = await apiClient.post<SignupResponse>('/auth/signup', payload);
    if (!res?.user || !res?.token) throw new Error('Invalid signup response');
    return res;
  },
};
