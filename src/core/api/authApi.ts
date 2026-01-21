import { apiClient } from './client';
import type { User, ApiResponse } from '@core/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

/** Adjust DTOs and paths to match your backend. */
export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse> | LoginResponse>(
      '/auth/login',
      payload,
    );
    const data = (res as ApiResponse<LoginResponse>).data ?? (res as LoginResponse);
    if (!data?.user || !data?.token) throw new Error('Invalid login response');
    return { user: data.user, token: data.token };
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User> | User>('/auth/me');
    const user = (res as ApiResponse<User>).data ?? (res as User);
    if (!user?.id) throw new Error('Invalid me response');
    return user;
  },
};
