import React, { useEffect } from 'react';
import { View, StyleSheet, Image, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Logo } from '@shared/components';
import { useAuthStore } from '@core/store';
import { ROUTES } from '@core/constants/routes';
import type { RootStackParamList } from '@core/constants/routes';
import { colors, spacing } from '@shared/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- RN asset resolution
const FAVICON = require('../../../assets/favicon-www.lifestation.com.png');

const WELCOME_DURATION_MS = 3000; // 3 seconds then navigate to login

type WelcomeNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNavigationProp>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ringSize = Math.min(width * 0.82, 340);
  const logoSize = Math.min(width * 0.68, 300);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace(ROUTES.APP, undefined);
      } else {
        navigation.replace(ROUTES.AUTH, undefined);
      }
    }, WELCOME_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.welcomeBg} />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}>
        <Logo size={logoSize} style={styles.logo} />
        <View
          style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
          <Image source={FAVICON} style={styles.favicon} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.welcomeBg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    opacity: 0.98,
    marginBottom: spacing.lg,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.welcomeRingBorder,
    backgroundColor: colors.welcomeRingBg,
  },
  favicon: {
    width: 180,
    height: 180,
  },
});

export default WelcomeScreen;
