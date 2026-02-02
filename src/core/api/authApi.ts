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
  cs_no?: string; // OPTION A: LifeStation account number (required for seniors)
}

export interface SignupResponse {
  message: string;
  token: string;
  refresh_token: string;
  user: User;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdatePasswordResponse {
  result: string;
}

export interface LifestationAccount {
  cs_no: string;
  name?: string;
  addr1?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone1?: string;
  status?: string;
}

export interface GetMeResponse {
  user: User;
}

export interface GetLifestationAccountResponse {
  account: LifestationAccount | null;
  message?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  mobile?: string | null;
  notification_enabled?: boolean;
}

export interface UpdateProfileResponse {
  message: string;
  user: Partial<User>;
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

  /** Get current user. Requires Bearer token. */
  async getMe(): Promise<GetMeResponse> {
    return apiClient.get<GetMeResponse>('/auth/me');
  },

  /** Get LifeStation account for current user (if cs_no). Requires Bearer token. */
  async getLifestationAccount(): Promise<GetLifestationAccountResponse> {
    return apiClient.get<GetLifestationAccountResponse>('/auth/lifestation-account');
  },

  /** Update profile (name, mobile, notification_enabled). Requires Bearer token. */
  async updateProfile(payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    return apiClient.patch<UpdateProfileResponse>('/auth/profile', payload);
  },

  /** Update password for authenticated user. Requires Bearer token. */
  async updatePassword(payload: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
    const res = await apiClient.post<UpdatePasswordResponse>('/auth/update-password', payload);
    return res;
  },
};
