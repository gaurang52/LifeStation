import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';

interface TopNavbarProps {
  title: string;
  subtitle?: string;
  icon?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
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
  showBackButton = false,
  onBackPress,
  rightAction,
  variant = 'default',
}) => {
  const isFigma = variant === 'figma';
  return (
    <View style={[styles.header, isFigma && styles.headerFigma]}>
      <View style={styles.headerLeft}>
        {showBackButton && (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        {icon && !isFigma && <MaterialIcons name={icon} size={28} color={colors.primary} />}
        <View style={styles.titleContainer}>
          {isFigma ? (
            <AppText variant="h2" color={colors.primary} style={styles.headerTitleFigma}>
              {title}
            </AppText>
          ) : (
            <AppText variant="h2" color={colors.text} style={styles.headerTitle}>
              {title}
            </AppText>
          )}
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
    paddingTop: spacing.md, // Reduced from xxl (48px) to md (16px)
    paddingBottom: spacing.md, // Reduced from lg (24px) to md (16px)
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
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    marginRight: spacing.xs / 2,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: colors.text,
  },
  headerTitleFigma: {
    fontSize: 28, // Larger font size
    fontWeight: '700', // font-bold
    color: colors.primary, // Same as button color
    lineHeight: 34, // Better line height for large text
  },
  subtitle: {
    marginTop: spacing.xs / 2,
  },
  subtitleFigma: {
    marginTop: spacing.xs / 2, // Reduced spacing between title and subtitle
    fontSize: 16, // Ensure readable size
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
