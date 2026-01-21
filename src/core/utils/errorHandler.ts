import { logger } from './logger';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: unknown;
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = {
        message: error.message,
        originalError: error,
      };
    } else if (typeof error === 'string') {
      appError = {
        message: error,
      };
    } else {
      appError = {
        message: 'An unexpected error occurred',
        originalError: error,
      };
    }

    logger.error(`Error in ${context || 'unknown context'}:`, appError);

    return appError;
  }

  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    // API client and similar layers return { message?: string }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const m = (error as { message?: unknown }).message;
      if (typeof m === 'string' && m) return m;
    }
    return 'An unexpected error occurred';
  }
}
