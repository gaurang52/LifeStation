import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@shared/theme';

type Props = ViewProps & {
  padded?: boolean;
  backgroundColor?: string;
  /** Which edges get safe area insets. Defaults to all. Use e.g. ['top'] for full-bleed bottom (e.g. map screens). */
  edges?: Edge[];
};

export const Screen: React.FC<Props> = ({
  children,
  style,
  padded = true,
  backgroundColor = colors.background,
  edges,
  ...rest
}) => (
  <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={edges}>
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
