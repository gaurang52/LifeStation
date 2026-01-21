import type { NavigatorScreenParams } from '@react-navigation/native';

/** Central route names for type-safe navigation. */
export const ROUTES = {
  // Root
  AUTH: 'Auth',
  APP: 'App',

  // Auth stack
  LOGIN: 'Login',

  // Tab / App stack
  HOME: 'Home',
  PROFILE: 'Profile',
} as const;

export type AuthStackParamList = {
  [ROUTES.LOGIN]: undefined;
};

export type TabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.PROFILE]: undefined;
};

export type RootStackParamList = {
  [ROUTES.AUTH]: NavigatorScreenParams<AuthStackParamList>;
  [ROUTES.APP]: NavigatorScreenParams<TabParamList>;
};
