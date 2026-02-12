import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT, ENV as ENV_NAME, APP_NAME, GOOGLE_PLACE_API_KEY } from '@env';

// Default fallback URLs based on platform
// For local development, use:
// - iOS Simulator: http://localhost:3000
// - Android Emulator: http://10.0.2.2:3000
// - Physical Device: http://YOUR_COMPUTER_IP:3000
const getDefaultApiUrl = () => {
  if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL && API_BASE_URL !== '') {
    // If user explicitly set localhost/127.0.0.1 and we're on Android, convert to 10.0.2.2
    const url = API_BASE_URL;
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      return url.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
    }
    return url;
  }
  // Fallback based on platform
  // Note: You should create a .env file with API_BASE_URL set
  // See ENV_SETUP.md for instructions
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const ENV = {
  API_BASE_URL: getDefaultApiUrl(),
  API_TIMEOUT: parseInt(API_TIMEOUT || '30000', 10),
  ENV: ENV_NAME || 'development',
  APP_NAME: APP_NAME || 'LifeStation',
  APP_VERSION: Platform.OS === 'ios' ? '1.1.0 (0)' : '1.1.0 (10)',
  GOOGLE_MAPS_API_KEY: GOOGLE_PLACE_API_KEY || '',
} as const;
