import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ENV } from '../constants/env';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

class ApiClient {
  private client: AxiosInstance;
  private tokenGetter: (() => string | null) | null = null;

  setTokenGetter(getter: () => string | null): void {
    this.tokenGetter = getter;
  }

  constructor() {
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: ENV.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        const token = this.tokenGetter?.() ?? null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });

        return config;
      },
      error => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug(
          `API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
          {
            status: response.status,
            data: response.data,
          },
        );
        return response;
      },
      (error: AxiosError) => {
        const appError = this.handleApiError(error);
        logger.error('API Response Error:', appError);
        return Promise.reject(appError);
      },
    );
  }

  private handleApiError(error: AxiosError): unknown {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        message: (data as { message?: string })?.message || `Request failed with status ${status}`,
        statusCode: status,
        originalError: error,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        message: 'Network error. Please check your connection.',
        originalError: error,
      };
    } else {
      // Something else happened
      return ErrorHandler.handle(error, 'API Client');
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
