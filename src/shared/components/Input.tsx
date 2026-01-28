import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@shared/theme';
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
  wrap: { gap: spacing.sm }, // mb-2 in Figma = 8px
  label: {
    fontWeight: '500', // font-medium in Figma
  },
  input: {
    height: 56, // py-4 in Figma = 16px top + 16px bottom + 24px line height = 56px
    borderWidth: 1,
    borderColor: colors.lightGray, // border-[#F5F5F5] in Figma
    borderRadius: borderRadius.lg, // rounded-xl = 16px
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, // py-4 = 16px
    backgroundColor: colors.lightGray, // bg-[#F5F5F5] in Figma
    ...typography.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error },
});
