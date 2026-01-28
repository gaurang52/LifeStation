import React from 'react';
import { Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import LifeStationLogo from '../../assets/LifeStationLogo.png';

type LogoProps = {
  size?: number;
  style?: ImageStyle | ViewStyle;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
};

/**
 * LifeStation Logo Component
 *
 * Note: Logo image file is located at src/assets/LifeStationLogo.png
 * Supported formats: PNG, JPG, JPEG
 */
export const Logo: React.FC<LogoProps> = ({ size = 120, style, resizeMode = 'contain' }) => {
  const logoSource = LifeStationLogo;

  return (
    <Image
      source={logoSource}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode={resizeMode}
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    // Additional styles can be added here if needed
  },
});
