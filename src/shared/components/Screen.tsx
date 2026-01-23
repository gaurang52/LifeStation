import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@shared/theme';

type Props = ViewProps & {
  padded?: boolean;
  backgroundColor?: string;
};

export const Screen: React.FC<Props> = ({
  children,
  style,
  padded = true,
  backgroundColor = colors.background,
  ...rest
}) => (
  <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
    <View
      style={[styles.container, padded && { padding: spacing.md }, style, { backgroundColor }]}
      {...rest}>
      {children}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
