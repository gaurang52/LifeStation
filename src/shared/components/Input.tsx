import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '@shared/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input: React.FC<Props> = ({ label, error, style, ...rest }) => (
  <View style={styles.wrap}>
    {label ? (
      <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
    ) : null}
    <TextInput
      style={[styles.input, error ? styles.inputError : null, style]}
      placeholderTextColor={colors.textSecondary}
      {...rest}
    />
    {error ? (
      <AppText variant="caption" color={colors.error} style={styles.error}>
        {error}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {},
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error },
});
