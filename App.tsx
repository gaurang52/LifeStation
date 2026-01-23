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
import RecentEventsScreen from '@features/events/screens/RecentEventsScreen';
import AddDeviceScreen from '@features/devices/screens/AddDeviceScreen';
import DeviceDetailsScreen from '@features/devices/screens/DeviceDetailsScreen';
import CareCircleScreen from '@features/caregivers/screens/CareCircleScreen';
import AddCaregiverScreen from '@features/caregivers/screens/AddCaregiverScreen';
import { useAuthStore } from '@core/store';
import { ErrorBoundary } from '@shared/components';
import { colors, spacing } from '@shared/theme';
import { ROUTES } from '@core/constants/routes';
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

// Styles for tab bar
const tabBarStyles = StyleSheet.create({
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.md,
    marginHorizontal: spacing.xs / 2,
    minHeight: 44, // Ensure touch target meets accessibility guidelines
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

  return (
    <TouchableOpacity
      {...props}
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
  } else if (routeName === ROUTES.DEVICE_DETAILS_TAB) {
    iconName = 'devices';
  } else if (routeName === ROUTES.CARE_CIRCLE) {
    iconName = 'add';
  } else if (routeName === ROUTES.PROFILE) {
    iconName = 'person';
  } else {
    iconName = 'help-outline';
  }

  return <MaterialIcons name={iconName} size={size || 24} color={color} />;
};

const Tabs = () => {
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = 60;
  const tabBarHeight = baseTabBarHeight + insets.bottom;

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
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingTop: spacing.sm,
          height: tabBarHeight,
          paddingHorizontal: spacing.xs,
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
        tabBarButton: props => <CustomTabBarButton {...props} />,
        tabBarIcon: ({ color, size }) => getTabBarIcon(route.name, color, size || 24),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: spacing.xs / 2,
        },
        tabBarItemStyle: {
          paddingVertical: spacing.xs,
        },
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
        name={ROUTES.DEVICE_DETAILS_TAB}
        component={DeviceDetailsScreen}
        options={{
          tabBarLabel: 'Device',
        }}
        initialParams={undefined}
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
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
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
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {isAuthenticated ? (
                <RootStack.Screen name={ROUTES.APP} component={AppNavigator} />
              ) : (
                <RootStack.Screen name={ROUTES.AUTH} component={Auth} />
              )}
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
