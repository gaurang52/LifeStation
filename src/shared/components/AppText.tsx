import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '@shared/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

export const AppText: React.FC<Props> = ({
  children,
  style,
  variant = 'body',
  color = colors.text,
  ...rest
}) => (
  <Text style={[typography[variant], styles.base, { color }, style]} {...rest}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
});
