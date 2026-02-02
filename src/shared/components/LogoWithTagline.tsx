import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '@shared/theme';
import LifeStationLogo from '../../assets/LifeStationLogo.png';

type LogoWithTaglineProps = {
  style?: ViewStyle;
};

/**
 * LifeStation logo with "MEDICAL ALERT SYSTEMS" tagline directly below (single visual unit).
 * Use on sign-in and sign-up screens.
 */
export const LogoWithTagline: React.FC<LogoWithTaglineProps> = ({ style }) => (
  <View style={[styles.container, style]}>
    <Image source={LifeStationLogo} style={styles.logo} resizeMode="contain" />
    <AppText style={styles.tagline}>MEDICAL ALERT SYSTEMS</AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 240,
    height: 110,
    marginBottom: -32,
  },
  tagline: {
    fontFamily: 'OpenSans-Regular',
    fontSize: 16,
    letterSpacing: 2,
    lineHeight: 16,
    color: colors.textSecondary,
    paddingVertical: 0,
    includeFontPadding: false,
  },
});
