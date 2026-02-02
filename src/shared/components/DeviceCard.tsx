import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';
import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';
import { colors, spacing, borderRadius } from '@shared/theme';
import type { Device } from '@core/api/deviceApi';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
}

const formatLastSeen = (lastSeen?: string | null): string => {
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

const getBatteryColor = (level?: number | null): string => {
  if (!level && level !== 0) return colors.gray;
  if (level >= 50) return colors.battery;
  if (level >= 20) return colors.warning;
  return colors.red;
};

const getSignalStrength = (strength?: number | null): { level: number; label: string } => {
  if (!strength && strength !== 0) return { level: 0, label: 'Unknown' };
  if (strength >= 75) return { level: 4, label: 'Excellent' };
  if (strength >= 50) return { level: 3, label: 'Good' };
  if (strength >= 25) return { level: 2, label: 'Fair' };
  return { level: 1, label: 'Poor' };
};

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onPress }) => {
  const batteryColor = getBatteryColor(device.battery_level);
  const signal = getSignalStrength(device.signal_strength);
  const lastSeen = formatLastSeen(device.last_seen);

  const content = (
    <Card style={[styles.card, { borderRadius: borderRadius.lg }]} padding={spacing.md}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="devices" size={24} color={colors.primary} />
          <View style={styles.deviceInfo}>
            <AppText variant="h3" style={styles.deviceName}>
              {device.name || 'Unnamed Device'}
            </AppText>
            <AppText variant="small" color={colors.textSecondary} style={styles.deviceId}>
              ID: {device.device_id}
            </AppText>
          </View>
        </View>
        <StatusBadge status={device.status} />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <MaterialIcons name="battery-full" size={20} color={batteryColor} />
          <View style={styles.statContent}>
            <AppText variant="small" color={colors.textSecondary}>
              Battery
            </AppText>
            <AppText variant="bodyBold" style={{ color: batteryColor }}>
              {device.battery_level !== null && device.battery_level !== undefined
                ? `${device.battery_level}%`
                : 'N/A'}
            </AppText>
          </View>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="signal-cellular-alt" size={20} color={colors.primary} />
          <View style={styles.statContent}>
            <AppText variant="small" color={colors.textSecondary}>
              Signal
            </AppText>
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
            <AppText variant="small" color={colors.textSecondary} style={styles.signalLabel}>
              {signal.label}
            </AppText>
          </View>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="access-time" size={20} color={colors.icon} />
          <View style={styles.statContent}>
            <AppText variant="small" color={colors.textSecondary}>
              Last Sync
            </AppText>
            <AppText variant="bodyBold">{lastSeen}</AppText>
          </View>
        </View>
      </View>

      {device.fall_detection_enabled && (
        <View style={styles.fallDetection}>
          <MaterialIcons name="shield" size={16} color={colors.green} />
          <AppText variant="small" color={colors.green} style={styles.fallDetectionText}>
            Fall Detection Enabled
          </AppText>
        </View>
      )}
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  deviceInfo: {
    marginLeft: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    marginBottom: spacing.xs / 2,
  },
  deviceId: {
    fontFamily: 'monospace',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statContent: {
    marginLeft: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 2,
    height: 20,
  },
  signalBar: {
    width: 3,
    borderRadius: 1.5,
  },
  signalLabel: {
    marginTop: 2,
  },
  fallDetection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fallDetectionText: {
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
});
