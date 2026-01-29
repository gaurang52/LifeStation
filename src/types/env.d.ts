declare module '@env' {
  export const API_BASE_URL: string;
  export const API_TIMEOUT: string;
  export const ENV: string;
  export const APP_NAME: string;
  export const APP_VERSION: string;
  export const GOOGLE_PLACE_API_KEY: string;
}

declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
