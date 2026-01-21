import 'react-native-gesture-handler';
import '@core/api/setup';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from '@features/home/screens/HomeScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import LoginScreen from '@features/auth/screens/LoginScreen';
import { useAuthStore } from '@core/store';
import { ErrorBoundary } from '@shared/components';
import { colors } from '@shared/theme';
import { ROUTES } from '@core/constants/routes';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const Tabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
    }}>
    <Tab.Screen name={ROUTES.HOME} component={HomeScreen} />
    <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
  </Tab.Navigator>
);

const Auth = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
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
                <RootStack.Screen name={ROUTES.APP} component={Tabs} />
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
