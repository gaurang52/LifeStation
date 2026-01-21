import { ENV } from '../constants/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private isDevelopment = ENV.ENV === 'development';

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry = this.formatMessage(level, message, data);

    if (this.isDevelopment) {
      const consoleMethod = level === 'error' ? console.error : console[level];
      consoleMethod(`[${entry.timestamp}] [${level.toUpperCase()}]`, message, data || '');
    }

    // In production, you can send logs to a logging service
    if (!this.isDevelopment && level === 'error') {
      // Example: Send to crash reporting service
      // crashlytics().recordError(new Error(message));
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorData = error instanceof Error ? { stack: error.stack, ...error } : error;
    this.log('error', errorMessage, errorData);
  }
}

export const logger = new Logger();
