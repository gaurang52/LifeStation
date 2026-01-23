import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';

interface TopNavbarProps {
  title: string;
  icon?: string;
  rightAction?: {
    label: string;
    icon?: string;
    onPress: () => void;
  };
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ title, icon, rightAction }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon && <MaterialIcons name={icon} size={28} color={colors.primary} />}
        <AppText variant="h2" style={styles.headerTitle}>
          {title}
        </AppText>
      </View>
      {rightAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={rightAction.onPress}
          activeOpacity={0.7}>
          {rightAction.icon && (
            <MaterialIcons name={rightAction.icon} size={20} color={colors.primary} />
          )}
          <AppText variant="bodyBold" color={colors.primary}>
            {rightAction.label}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
});
