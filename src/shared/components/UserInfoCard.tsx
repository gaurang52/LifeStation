import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';
import { AppText } from './AppText';
import { colors, spacing } from '@shared/theme';
import type { User } from '@core/types';

interface UserInfoCardProps {
  user: User;
  deviceCount: number;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({ user, deviceCount }) => {
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="person" size={24} color={colors.primary} />
        </View>
        <View style={styles.userInfo}>
          <AppText variant="h3" style={styles.userName}>
            {user.name || 'User'}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.userEmail}>
            {user.email}
          </AppText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <MaterialIcons name="devices" size={20} color={colors.primary} />
          <View style={styles.statContent}>
            <AppText variant="h2" style={styles.statValue}>
              {deviceCount}
            </AppText>
            <AppText variant="small" color={colors.textSecondary}>
              {deviceCount === 1 ? 'Device' : 'Devices'}
            </AppText>
          </View>
        </View>

        <View style={styles.stat}>
          <MaterialIcons name="badge" size={20} color={colors.icon} />
          <View style={styles.statContent}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
              Role
            </AppText>
            <AppText variant="bodyBold" style={styles.statValue}>
              {user.user_type === 'senior'
                ? 'Senior'
                : user.user_type === 'caregiver'
                ? 'Caregiver'
                : user.user_type || 'User'}
            </AppText>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: spacing.xs / 2,
  },
  userEmail: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statContent: {
    marginLeft: spacing.sm,
  },
  statValue: {
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    marginBottom: spacing.xs / 2,
  },
});
