import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';

interface TopNavbarProps {
  title: string;
  subtitle?: string;
  icon?: string;
  rightAction?: {
    label: string;
    icon?: string;
    onPress: () => void;
  };
  variant?: 'default' | 'figma';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  subtitle,
  icon,
  rightAction,
  variant = 'default',
}) => {
  const isFigma = variant === 'figma';
  return (
    <View style={[styles.header, isFigma && styles.headerFigma]}>
      <View style={styles.headerLeft}>
        {icon && !isFigma && <MaterialIcons name={icon} size={28} color={colors.primary} />}
        <View style={styles.titleContainer}>
          <AppText variant="h2" style={[styles.headerTitle, isFigma && styles.headerTitleFigma]}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText
              variant="body"
              color={colors.textSecondary}
              style={[styles.subtitle, isFigma && styles.subtitleFigma]}>
              {subtitle}
            </AppText>
          )}
        </View>
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
  headerFigma: {
    paddingHorizontal: spacing.lg, // px-6
    paddingTop: spacing.xxl, // pt-12
    paddingBottom: spacing.lg, // pb-6
    borderBottomColor: colors.lightGray, // border-[#F5F5F5]
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleFigma: {
    fontSize: 24, // text-2xl
    fontWeight: '600', // font-semibold
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs / 2,
  },
  subtitleFigma: {
    marginTop: spacing.xs / 2, // mt-1
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
