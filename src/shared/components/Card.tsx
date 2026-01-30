import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '@shared/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = spacing.md }) => {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 6, // Match reference app: scale(6) instead of borderRadius.xl (20px)
    borderWidth: 1,
    borderColor: colors.lightGray || '#E0E0E0', // Match reference app: colors.card
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4, // Match reference app: shadowRadius: 4
    elevation: 1, // Match reference app: elevation: 1
  },
});
