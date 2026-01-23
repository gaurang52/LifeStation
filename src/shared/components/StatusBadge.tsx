import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '@shared/theme';

type StatusType = 'online' | 'offline' | 'unknown' | 'warning' | 'error';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
}

const getStatusConfig = (status: string): { color: string; bgColor: string } => {
  const normalized = status.toLowerCase();

  if (normalized.includes('online') || normalized === 'active' || normalized === 'connected') {
    return { color: colors.green, bgColor: '#f0fdf4' };
  }
  if (
    normalized.includes('offline') ||
    normalized === 'inactive' ||
    normalized === 'disconnected'
  ) {
    return { color: colors.red, bgColor: '#fef2f2' };
  }
  if (normalized.includes('warning') || normalized === 'low') {
    return { color: colors.warning, bgColor: '#fffbeb' };
  }
  if (normalized.includes('error') || normalized === 'critical') {
    return { color: colors.error, bgColor: '#fef2f2' };
  }
  return { color: colors.gray, bgColor: '#f3f4f6' };
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = getStatusConfig(status);
  const displayText = label || status;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <AppText variant="small" style={[styles.text, { color: config.color }]}>
        {displayText}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  text: {
    textTransform: 'capitalize',
    fontWeight: '600',
  },
});
