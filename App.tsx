import 'react-native-gesture-handler';
import '@core/api/setup';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '@features/home/screens/HomeScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import LoginScreen from '@features/auth/screens/LoginScreen';
import SignupScreen from '@features/auth/screens/SignupScreen';
import WelcomeScreen from '@features/auth/screens/WelcomeScreen';
import RecentEventsScreen from '@features/events/screens/RecentEventsScreen';
import MapScreen from '@features/maps/screens/MapScreen';
import AddDeviceScreen from '@features/devices/screens/AddDeviceScreen';
import DeviceDetailsScreen from '@features/devices/screens/DeviceDetailsScreen';
import DeviceDetailsTabScreen from '@features/devices/screens/DeviceDetailsTabScreen';
import CareCircleScreen from '@features/caregivers/screens/CareCircleScreen';
import AddCaregiverScreen from '@features/caregivers/screens/AddCaregiverScreen';
import { useAuthStore } from '@core/store';
import { ErrorBoundary } from '@shared/components';
import { colors, spacing } from '@shared/theme';
import { logger } from '@core/utils/logger';
import { ROUTES } from '@core/constants/routes';
import {
  requestNotificationPermission,
  checkNotificationPermission,
} from '@core/utils/notificationPermissions';
import { setupNotificationHandlers } from '@core/services/notificationHandler';
import { registerDeviceForRemoteMessages } from '@core/services/fcmService';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AppStack = createStackNavigator();

// Tab bar layout constants - compact to fit 5 tabs on smaller screens (e.g. Realme X2 Pro)
const TAB_BAR_BUTTON_PADDING_H = 2;
const TAB_BAR_BUTTON_MARGIN_H = 2;
const TAB_BAR_BUTTON_MIN_HEIGHT = 40;
const TAB_BAR_BASE_HEIGHT = 64;
const TAB_BAR_LABEL_FONT_SIZE = 11;
const TAB_BAR_LABEL_MARGIN_TOP = 2;
const TAB_BAR_ITEM_PADDING_V = 4;

const tabBarStyles = StyleSheet.create({
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: TAB_BAR_BUTTON_PADDING_H,
    borderRadius: spacing.md,
    marginHorizontal: TAB_BAR_BUTTON_MARGIN_H,
    minHeight: TAB_BAR_BUTTON_MIN_HEIGHT,
  },
  tabBarButtonSelected: {
    backgroundColor: colors.lightPrimary,
  },
});

// Custom tab bar button with selected state highlight
const CustomTabBarButton = ({
  children,
  onPress,
  accessibilityState,
  style,
  ...props
}: BottomTabBarButtonProps) => {
  const isSelected = accessibilityState?.selected;
  // BottomTabBarButtonProps allows null for some optional props; TouchableOpacity expects undefined.
  const touchableProps = props as React.ComponentProps<typeof TouchableOpacity>;

  return (
    <TouchableOpacity
      {...touchableProps}
      onPress={onPress}
      activeOpacity={0.7}
      style={[tabBarStyles.tabBarButton, isSelected && tabBarStyles.tabBarButtonSelected, style]}>
      {children}
    </TouchableOpacity>
  );
};

// Tab bar icon renderer - moved outside to avoid nested component warning
const getTabBarIcon = (routeName: string, color: string, size: number) => {
  let iconName: string;

  if (routeName === ROUTES.HOME) {
    iconName = 'home';
  } else if (routeName === ROUTES.RECENT_EVENTS) {
    iconName = 'event';
  } else if (routeName === ROUTES.MAP) {
    iconName = 'map';
  } else if (routeName === ROUTES.CARE_CIRCLE) {
    iconName = 'add';
  } else if (routeName === ROUTES.PROFILE) {
    iconName = 'person';
  } else {
    iconName = 'help-outline';
  }

  return <MaterialIcons name={iconName} size={size || 24} color={color} />;
};

// Stable tab icon components (defined outside Tabs to satisfy react/no-unstable-nested-components)
const HomeTabIcon = (props: { color: string; size?: number }) =>
  getTabBarIcon(ROUTES.HOME, props.color, props.size || 24);
const EventsTabIcon = (props: { color: string; size?: number }) =>
  getTabBarIcon(ROUTES.RECENT_EVENTS, props.color, props.size || 24);
const MapTabIcon = (props: { color: string; size?: number }) =>
  getTabBarIcon(ROUTES.MAP, props.color, props.size || 24);
const CareCircleTabIcon = (props: { color: string; size?: number }) =>
  getTabBarIcon(ROUTES.CARE_CIRCLE, props.color, props.size || 24);
const ProfileTabIcon = (props: { color: string; size?: number }) =>
  getTabBarIcon(ROUTES.PROFILE, props.color, props.size || 24);

const tabBarIconByRoute: Record<
  string,
  (props: { color: string; size?: number }) => React.ReactElement
> = {
  [ROUTES.HOME]: HomeTabIcon,
  [ROUTES.RECENT_EVENTS]: EventsTabIcon,
  [ROUTES.MAP]: MapTabIcon,
  [ROUTES.CARE_CIRCLE]: CareCircleTabIcon,
  [ROUTES.PROFILE]: ProfileTabIcon,
};

/** Minimum bottom padding for Android (some devices report 0 for insets.bottom) */
const ANDROID_MIN_BOTTOM_PADDING = 12;

const Tabs = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_MIN_BOTTOM_PADDING)
      : Math.max(insets.bottom, spacing.sm);
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          paddingBottom: bottomPadding,
          paddingTop: spacing.sm,
          height: tabBarHeight,
          paddingHorizontal: TAB_BAR_BUTTON_PADDING_H,
          ...Platform.select({
            ios: {
              shadowColor: colors.black,
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarButton: CustomTabBarButton,
        tabBarIcon: tabBarIconByRoute[route.name] ?? ProfileTabIcon,
        tabBarLabelStyle: {
          fontSize: TAB_BAR_LABEL_FONT_SIZE,
          fontWeight: '500',
          marginTop: TAB_BAR_LABEL_MARGIN_TOP,
          maxWidth: '100%',
        },
        tabBarItemStyle: {
          paddingVertical: TAB_BAR_ITEM_PADDING_V,
        },
        tabBarAllowFontScaling: false,
      })}>
      <Tab.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name={ROUTES.RECENT_EVENTS}
        component={RecentEventsScreen}
        options={{
          tabBarLabel: 'Events',
        }}
      />
      <Tab.Screen
        name={ROUTES.MAP}
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen
        name={ROUTES.CARE_CIRCLE}
        component={CareCircleScreen}
        options={{
          tabBarLabel: 'Care Circle',
        }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="MainTabs" component={Tabs} />
    <AppStack.Screen name={ROUTES.ADD_DEVICE} component={AddDeviceScreen} />
    <AppStack.Screen name={ROUTES.DEVICE_DETAILS} component={DeviceDetailsScreen} />
    <AppStack.Screen name={ROUTES.DEVICE_DETAILS_TAB} component={DeviceDetailsTabScreen} />
    <AppStack.Screen name={ROUTES.ADD_CAREGIVER} component={AddCaregiverScreen} />
  </AppStack.Navigator>
);

const Auth = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
    <AuthStack.Screen name={ROUTES.SIGNUP} component={SignupScreen} />
  </AuthStack.Navigator>
);

const App = (): React.JSX.Element => {
  const hasHydrated = useAuthStore(state => state._hasHydrated);

  // Safety fallback: if hydration doesn't complete within 3 seconds, force it
  useEffect(() => {
    if (!hasHydrated) {
      const timeout = setTimeout(() => {
        useAuthStore.setState({ _hasHydrated: true });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [hasHydrated]);

  // Setup notification handlers and request permission after app has hydrated
  useEffect(() => {
    if (hasHydrated) {
      const initializeNotifications = async () => {
        try {
          // Register device for remote messages (iOS only, required before getToken)
          await registerDeviceForRemoteMessages();

          // Setup notification handlers
          setupNotificationHandlers(remoteMessage => {
            logger.debug('Notification opened', { messageId: remoteMessage?.messageId });
          });

          // Check if permission is already granted
          const hasPermission = await checkNotificationPermission();
          if (!hasPermission) {
            // Request permission if not already granted
            await requestNotificationPermission();
          }
        } catch (error) {
          logger.warn('Failed to initialize notifications', error);
        }
      };

      // Small delay to ensure app is fully initialized
      const timeout = setTimeout(() => {
        initializeNotifications();
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <ErrorBoundary>
          <NavigationContainer>
            <RootStack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName={ROUTES.WELCOME}>
              <RootStack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
              <RootStack.Screen name={ROUTES.AUTH} component={Auth} />
              <RootStack.Screen name={ROUTES.APP} component={AppNavigator} />
            </RootStack.Navigator>
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
