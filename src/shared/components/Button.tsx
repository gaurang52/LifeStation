import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@shared/theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export const Button: React.FC<Props> = ({ label, onPress, loading, disabled }) => {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <AppText variant="bodyBold" style={styles.label} color={colors.surface}>
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, // 16px to match Figma py-4
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, // 16px rounded-xl to match Figma
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.lightGray,
    opacity: 0.6,
  },
  label: {
    ...typography.bodyBold,
    color: colors.surface,
  },
});
