/** Jest mock for @env (react-native-dotenv) */
module.exports = {
  API_BASE_URL: 'https://api.example.com',
  API_TIMEOUT: '30000',
  ENV: 'test',
  APP_NAME: 'LifeStation',
  APP_VERSION: '1.1.0 (0)', // Mock uses iOS format; tests can override for Android
};
