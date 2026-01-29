import React from 'react';
import { Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import LifeStationLogo from '../../assets/LifeStationLogo.png';

type LogoProps = {
  size?: number;
  style?: ImageStyle | ViewStyle;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  /** Use on dark/primary backgrounds for contrast (e.g. white). Omit for primary-color logo on light bg. */
  tintColor?: string;
};

/**
 * LifeStation Logo — use the asset only; do not recreate logotype with font.
 * On low-contrast backgrounds use tintColor for the appropriate white or black version.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 120,
  style,
  resizeMode = 'contain',
  tintColor,
}) => {
  return (
    <Image
      source={LifeStationLogo}
      style={[
        styles.logo,
        { width: size, height: size },
        tintColor ? { tintColor } : undefined,
        style,
      ]}
      resizeMode={resizeMode}
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    // Additional styles can be added here if needed
  },
});
