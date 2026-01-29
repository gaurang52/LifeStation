import type { NavigatorScreenParams } from '@react-navigation/native';

/** Central route names for type-safe navigation. */
export const ROUTES = {
  // Root
  WELCOME: 'Welcome',
  AUTH: 'Auth',
  APP: 'App',

  // Auth stack
  LOGIN: 'Login',
  SIGNUP: 'Signup',

  // Tab / App stack
  HOME: 'Home',
  PROFILE: 'Profile',
  RECENT_EVENTS: 'RecentEvents',
  ADD_DEVICE: 'AddDevice',
  DEVICE_DETAILS: 'DeviceDetails',
  DEVICE_DETAILS_TAB: 'DeviceDetailsTab',
  CARE_CIRCLE: 'CareCircle',
  ADD_CAREGIVER: 'AddCaregiver',
} as const;

export type AuthStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.SIGNUP]: undefined;
};

export type TabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.RECENT_EVENTS]: undefined;
  [ROUTES.DEVICE_DETAILS_TAB]:
    | {
        deviceId?: string;
        idType?: 'imei' | 'serial' | 'uuid' | 'iccid';
      }
    | undefined;
  [ROUTES.CARE_CIRCLE]: undefined;
};

export type AppStackParamList = {
  [ROUTES.ADD_DEVICE]: undefined;
  [ROUTES.DEVICE_DETAILS]: {
    deviceId: string;
    idType: 'imei' | 'serial' | 'uuid';
  };
  [ROUTES.ADD_CAREGIVER]: undefined;
};

export type RootStackParamList = {
  [ROUTES.WELCOME]: undefined;
  [ROUTES.AUTH]: NavigatorScreenParams<AuthStackParamList> | undefined;
  [ROUTES.APP]: NavigatorScreenParams<AppStackParamList> | undefined;
};
