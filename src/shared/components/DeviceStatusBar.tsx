import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';

interface BatteryStatusProps {
  level?: number | null;
}

export const BatteryStatus: React.FC<BatteryStatusProps> = ({ level }) => {
  const getBatteryColor = (): string => {
    if (!level && level !== 0) return colors.gray;
    if (level >= 50) return colors.battery;
    if (level >= 20) return colors.warning;
    return colors.red;
  };

  const getBatteryIcon = (): string => {
    if (!level && level !== 0) return 'battery-unknown';
    if (level >= 90) return 'battery-full';
    if (level >= 60) return 'battery-6-bar';
    if (level >= 30) return 'battery-4-bar';
    if (level >= 10) return 'battery-2-bar';
    return 'battery-alert';
  };

  const batteryColor = getBatteryColor();
  const iconName = getBatteryIcon();

  return (
    <View style={styles.statusItem}>
      <MaterialIcons name={iconName} size={20} color={batteryColor} />
      <View style={styles.statusContent}>
        <AppText variant="small" color={colors.textSecondary}>
          Battery
        </AppText>
        <AppText variant="bodyBold" style={{ color: batteryColor }}>
          {level !== null && level !== undefined ? `${level}%` : 'N/A'}
        </AppText>
      </View>
    </View>
  );
};

interface SignalStatusProps {
  strength?: number | null;
}

export const SignalStatus: React.FC<SignalStatusProps> = ({ strength }) => {
  const getSignalStrength = (): { level: number; label: string } => {
    if (!strength && strength !== 0) return { level: 0, label: 'Unknown' };
    if (strength >= 75) return { level: 4, label: 'Excellent' };
    if (strength >= 50) return { level: 3, label: 'Good' };
    if (strength >= 25) return { level: 2, label: 'Fair' };
    return { level: 1, label: 'Poor' };
  };

  const signal = getSignalStrength();

  return (
    <View style={styles.statusItem}>
      <View style={styles.signalBars}>
        {[1, 2, 3, 4].map(bar => (
          <View
            key={bar}
            style={[
              styles.signalBar,
              {
                backgroundColor: bar <= signal.level ? colors.primary : colors.border,
                height: bar * 4 + 4,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.statusContent}>
        <AppText variant="small" color={colors.textSecondary}>
          Signal
        </AppText>
        <AppText variant="bodyBold">{signal.label}</AppText>
      </View>
    </View>
  );
};

interface LastSyncStatusProps {
  lastSeen?: string | null;
}

export const LastSyncStatus: React.FC<LastSyncStatusProps> = ({ lastSeen }) => {
  const formatLastSeen = (): string => {
    if (!lastSeen) return 'Never';

    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <View style={styles.statusItem}>
      <MaterialIcons name="access-time" size={20} color={colors.icon} />
      <View style={styles.statusContent}>
        <AppText variant="small" color={colors.textSecondary}>
          Last Sync
        </AppText>
        <AppText variant="bodyBold">{formatLastSeen()}</AppText>
      </View>
    </View>
  );
};

interface DeviceStatusBarProps {
  battery?: number | null;
  signal?: number | null;
  lastSeen?: string | null;
  style?: ViewStyle;
}

export const DeviceStatusBar: React.FC<DeviceStatusBarProps> = ({
  battery,
  signal,
  lastSeen,
  style,
}) => {
  return (
    <View style={[styles.statusBar, style]}>
      <BatteryStatus level={battery} />
      <View style={styles.divider} />
      <SignalStatus strength={signal} />
      <View style={styles.divider} />
      <LastSyncStatus lastSeen={lastSeen} />
    </View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusContent: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 20,
  },
  signalBar: {
    width: 3,
    borderRadius: 1.5,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
});
