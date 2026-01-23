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

        // Check if this is an expected/handled error (e.g., 404 for vitals when cs_no not set)
        const isExpectedError = this.isExpectedError(error, appError);

        if (isExpectedError) {
          // Log expected errors at debug level instead of error level
          logger.debug('API Response Error (expected):', appError);
        } else {
          logger.error('API Response Error:', appError);
        }

        return Promise.reject(appError);
      },
    );
  }

  private isExpectedError(error: AxiosError, _appError: unknown): boolean {
    // Check if this is a 404 error that's expected/handled gracefully
    if (error.response?.status === 404) {
      const errorMessage =
        (error.response.data as { error?: string })?.error ||
        (error.response.data as { message?: string })?.message ||
        '';

      const lowerMessage = errorMessage.toLowerCase();

      // Expected errors for vitals when account is not linked to external system
      if (
        error.config?.url?.includes('/vitals/') &&
        (lowerMessage.includes('not found') ||
          lowerMessage.includes('not linked') ||
          lowerMessage.includes('external system'))
      ) {
        return true;
      }
    }

    return false;
  }

  private handleApiError(error: AxiosError): unknown {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      // Backend returns { error: string } or { message: string }
      const errorMessage =
        (data as { error?: string })?.error ||
        (data as { message?: string })?.message ||
        `Request failed with status ${status}`;
      return {
        message: errorMessage,
        statusCode: status,
        originalError: error,
      };
    } else if (error.request) {
      // Request made but no response received
      const baseUrl = error.config?.baseURL || 'unknown';
      const url = error.config?.url || 'unknown';
      const fullUrl = `${baseUrl}${url}`;

      // Provide helpful error message for common issues
      let errorMessage = 'Network error. Please check your connection.';

      if (baseUrl.includes('api.example.com')) {
        errorMessage = `API URL not configured. Please create a .env file with API_BASE_URL set to your backend URL (e.g., http://localhost:3000). See ENV_SETUP.md for details.`;
      } else if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        errorMessage = `Cannot connect to ${fullUrl}. Make sure your backend server is running and accessible.`;
      } else if (baseUrl.includes('10.0.2.2')) {
        errorMessage = `Cannot connect to ${fullUrl}. Make sure your backend server is running on your host machine and accessible from the Android emulator.`;
      }

      return {
        message: errorMessage,
        originalError: error,
        baseUrl,
        url: fullUrl,
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

  async getWithParams<T>(url: string, params?: Record<string, string>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
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

  /**
   * Download file from API
   * @param url - API endpoint URL
   * @param params - Query parameters
   * @returns Promise with file data (string for text, base64 for binary) and filename
   */
  async downloadFile(
    url: string,
    params?: Record<string, string>,
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // Determine response type based on format
    const isPDF = params?.format === 'pdf';
    const response = await this.client.get(url, {
      params,
      responseType: isPDF ? 'arraybuffer' : 'text', // Use arraybuffer for PDF
    });

    // Extract filename from Content-Disposition header
    const contentDisposition =
      response.headers['content-disposition'] ||
      (response.headers as Record<string, string>)['content-disposition'];
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const contentType =
      response.headers['content-type'] ||
      (response.headers as Record<string, string>)['content-type'] ||
      'text/plain';

    // Convert arraybuffer to base64 for PDF
    let data: string;
    if (isPDF && response.data instanceof ArrayBuffer) {
      // Convert ArrayBuffer to base64 for React Native compatibility
      const bytes = new Uint8Array(response.data);
      const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < bytes.length) {
        const a = bytes[i++];
        const b = i < bytes.length ? bytes[i++] : 0;
        const c = i < bytes.length ? bytes[i++] : 0;
        // eslint-disable-next-line no-bitwise
        const bitmap = (a << 16) | (b << 8) | c;
        // eslint-disable-next-line no-bitwise
        result += base64Chars.charAt((bitmap >> 18) & 63);
        // eslint-disable-next-line no-bitwise
        result += base64Chars.charAt((bitmap >> 12) & 63);
        // eslint-disable-next-line no-bitwise
        result += i - 2 < bytes.length ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
        // eslint-disable-next-line no-bitwise
        result += i - 1 < bytes.length ? base64Chars.charAt(bitmap & 63) : '=';
      }
      data = result;
    } else {
      data = response.data as string;
    }

    return {
      data,
      filename,
      contentType,
    };
  }
}

export const apiClient = new ApiClient();
