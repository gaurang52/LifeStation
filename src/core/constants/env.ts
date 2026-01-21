import { API_BASE_URL, API_TIMEOUT, ENV as ENV_NAME, APP_NAME, APP_VERSION } from '@env';

export const ENV = {
  API_BASE_URL: API_BASE_URL || 'https://api.example.com',
  API_TIMEOUT: parseInt(API_TIMEOUT || '30000', 10),
  ENV: ENV_NAME || 'development',
  APP_NAME: APP_NAME || 'LifeStation',
  APP_VERSION: APP_VERSION || '1.0.0',
} as const;
