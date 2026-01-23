import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Card, StatusBadge, DeviceStatusBar } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { deviceApi, type Device, type DeviceIdType } from '@core/api/deviceApi';
import { reportsApi } from '@core/api/reportsApi';
import { useAuthStore } from '@core/store';
import { ErrorHandler } from '@core/utils/errorHandler';
import { downloadFile } from '@core/utils/fileDownloader';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '@core/constants/routes';

interface DeviceDetailsScreenProps {
  route: {
    params?: {
      deviceId?: string;
      idType?: DeviceIdType;
    };
  };
}

const DeviceDetailsScreen: React.FC<DeviceDetailsScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const routeParams = route?.params;
  const [deviceId, setDeviceId] = useState<string | null>(routeParams?.deviceId || null);
  const [idType, setIdType] = useState<DeviceIdType | null>(routeParams?.idType || null);
  const [fetchingFirstDevice, setFetchingFirstDevice] = useState(
    !routeParams?.deviceId || !routeParams?.idType,
  );
  const [device, setDevice] = useState<Device | null>(null);
  const [fallDetectionEnabled, setFallDetectionEnabled] = useState(false);
  const [battery, setBattery] = useState<number | undefined>(undefined);
  const [signal, setSignal] = useState<number | undefined>(undefined);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [requestingSignal, setRequestingSignal] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent duplicate API calls (matching HomeScreen pattern)
  const isFetchingDeviceRecent = useRef(false);
  const fetchedDeviceRecentId = useRef<string | null>(null);

  // Fetch first device if deviceId/idType not provided (for tab navigation)
  useEffect(() => {
    if (fetchingFirstDevice && !deviceId && !idType) {
      const fetchFirstDevice = async () => {
        try {
          setLoading(true);
          const response = await deviceApi.getDevices(1, 1);
          const deviceList = response.devices || [];
          if (deviceList.length > 0) {
            const firstDevice = deviceList[0];
            if (firstDevice.id_type && firstDevice.device_id) {
              setDeviceId(firstDevice.device_id);
              setIdType(firstDevice.id_type);
              setFetchingFirstDevice(false);
            } else {
              setError('Device missing required fields');
              setLoading(false);
            }
          } else {
            setError(null); // No devices - will show empty state
            setLoading(false);
            setFetchingFirstDevice(false);
          }
        } catch (err) {
          const errorMessage = ErrorHandler.getErrorMessage(err) || 'Failed to load devices.';
          setError(errorMessage);
          setLoading(false);
          setFetchingFirstDevice(false);
        }
      };
      fetchFirstDevice();
    }
  }, [fetchingFirstDevice, deviceId, idType]);

  const fetchDeviceRecent = useCallback(async () => {
    if (!deviceId || !idType) {
      return;
    }

    // Prevent duplicate calls - if already fetching, skip this call
    if (isFetchingDeviceRecent.current) {
      console.log('Skipping duplicate fetchDeviceRecent call - already in progress');
      return;
    }

    // Create a unique identifier for this device
    const deviceKey = `${idType}:${deviceId}`;

    // Prevent duplicate calls - if already fetched for this device, skip
    if (fetchedDeviceRecentId.current === deviceKey) {
      console.log('Skipping fetchDeviceRecent - already fetched for this device:', deviceKey);
      return;
    }

    try {
      isFetchingDeviceRecent.current = true;
      setLoading(true);
      setError(null);

      console.log('Calling Get Recent Device Info API:', {
        id_type: idType,
        device_id: deviceId,
        api_endpoint: `/devices/${idType}/${deviceId}/recent`,
      });

      const response = await deviceApi.getDeviceRecent(idType, deviceId);
      const deviceData = response.device;

      console.log('Device recent response received:', {
        device: deviceData,
        battery_level: deviceData.battery_level,
        signal_strength: deviceData.signal_strength,
        last_seen: deviceData.last_seen,
      });

      // Update device state with recent data
      setDevice(deviceData);
      setBattery(deviceData.battery_level || undefined);
      setSignal(deviceData.signal_strength || undefined);
      setLastUpdate(deviceData.last_seen || undefined);

      // Fetch fall detection status
      try {
        const fallResponse = await deviceApi.getFallDetection(idType, deviceId);
        setFallDetectionEnabled(fallResponse.fall_detection_enabled || false);
      } catch (e) {
        console.warn('Failed to fetch fall detection:', e);
      }

      // Mark this device as fetched
      fetchedDeviceRecentId.current = deviceKey;
    } catch (err) {
      console.error('Error fetching device recent info:', err);
      const errorMessage = ErrorHandler.getErrorMessage(err) || 'Failed to load device details.';
      setError(errorMessage);

      // If the call failed, try using iccid as fallback if available
      // This matches HomeScreen behavior
      if (idType !== 'iccid') {
        // Note: We don't have access to device.sim_iccid here, so we'll just show error
        // The fallback logic would require the device object which we don't have yet
      }
    } finally {
      isFetchingDeviceRecent.current = false;
      setLoading(false);
    }
  }, [idType, deviceId]);

  useEffect(() => {
    if (deviceId && idType && !fetchingFirstDevice) {
      fetchDeviceRecent();
    }
  }, [deviceId, idType, fetchingFirstDevice, fetchDeviceRecent]);

  const handleToggleFallDetection = async (enabled: boolean) => {
    if (!idType || !deviceId) return;
    try {
      setUpdating(true);
      await deviceApi.toggleFallDetection(idType, deviceId, enabled);
      setFallDetectionEnabled(enabled);
      Alert.alert('Success', `Fall detection ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      const errorMessage = ErrorHandler.getErrorMessage(err) || 'Failed to update fall detection.';
      Alert.alert('Error', errorMessage);
      setFallDetectionEnabled(!enabled);
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestSignal = async () => {
    if (!idType || !deviceId) return;
    Alert.alert('Request Signal', 'This will send a signal request to the device. Continue?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Request',
        onPress: async () => {
          try {
            setRequestingSignal(true);
            await deviceApi.requestSignal(idType, deviceId);
            Alert.alert('Success', 'Signal request sent successfully to the device.');
          } catch (err) {
            const errorMessage =
              ErrorHandler.getErrorMessage(err) || 'Failed to request signal from device.';
            Alert.alert('Error', errorMessage);
          } finally {
            setRequestingSignal(false);
          }
        },
      },
    ]);
  };

  const handleDownloadReport = async (format: 'csv' | 'json' | 'pdf' = 'pdf') => {
    if (!deviceId || !idType) {
      Alert.alert('Error', 'Device information not available. Please select a device.');
      return;
    }

    try {
      setDownloadingReport(true);

      // Use Recent Reports API endpoint from Postman collection
      const result = await reportsApi.downloadRecentReports(deviceId, format, idType);

      if (format === 'pdf') {
        // For PDF, download directly to device (already base64)
        await downloadFile(result.data, result.filename, result.contentType, false);
      } else {
        // For CSV/JSON, download to device (convert text to base64)
        await downloadFile(result.data, result.filename, result.contentType, true);
      }
    } catch (err: unknown) {
      console.error('Error downloading report:', err);
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to download report. Please try again.';

      // Check if it's a specific error from backend
      const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
      const backendError = axiosError?.response?.data?.error || axiosError?.response?.data?.message;

      Alert.alert('Download Failed', backendError || errorMessage, [{ text: 'OK' }]);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleDownloadPress = () => {
    Alert.alert(
      'Download Report',
      'Choose report format:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'PDF',
          onPress: () => handleDownloadReport('pdf'),
        },
        {
          text: 'CSV',
          onPress: () => handleDownloadReport('csv'),
        },
        {
          text: 'JSON',
          onPress: () => handleDownloadReport('json'),
        },
      ],
      { cancelable: true },
    );
  };

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

  const renderDetailRow = (
    icon: string,
    label: string,
    value: string | number | null | undefined,
    iconColor?: string,
  ) => {
    if (value === null || value === undefined) return null;
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailLeft}>
          <MaterialIcons name={icon as string} size={20} color={iconColor || colors.icon} />
          <AppText variant="body" color={colors.textSecondary} style={styles.detailLabel}>
            {label}
          </AppText>
        </View>
        <AppText variant="bodyBold" style={styles.detailValue}>
          {value}
        </AppText>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices" size={64} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading device details...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error && !fetchingFirstDevice) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Device
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
          <Button
            label="Retry"
            onPress={() => {
              if (deviceId && idType) {
                fetchDeviceRecent();
              } else {
                setFetchingFirstDevice(true);
              }
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!deviceId || !idType) {
    if (!loading && !fetchingFirstDevice) {
      return (
        <Screen>
          <View style={styles.centerContainer}>
            <MaterialIcons name="devices-other" size={64} color={colors.icon} />
            <AppText variant="h3" style={styles.emptyTitle}>
              No Devices Found
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
              {user?.user_type === 'senior'
                ? 'No devices registered. Please add a device to get started.'
                : 'No devices available. Devices will appear here once they are registered.'}
            </AppText>
            {user?.user_type === 'senior' && (
              <Button label="Add Device" onPress={() => navigation.navigate(ROUTES.ADD_DEVICE)} />
            )}
          </View>
        </Screen>
      );
    }
  }

  if (!device && !loading && deviceId && idType) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices-other" size={64} color={colors.icon} />
          <AppText variant="body" color={colors.textSecondary}>
            Device not found
          </AppText>
        </View>
      </Screen>
    );
  }

  const batteryColor =
    battery !== null && battery !== undefined
      ? battery >= 50
        ? colors.battery
        : battery >= 20
        ? colors.warning
        : colors.red
      : colors.gray;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Device Status Bar - matching HomeScreen */}
        {device && (
          <DeviceStatusBar
            battery={battery ?? device.battery_level ?? undefined}
            signal={signal ?? device.signal_strength ?? undefined}
            lastSeen={lastUpdate ?? device.last_seen ?? undefined}
            style={styles.statusBarContainer}
          />
        )}

        <Card style={styles.section}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceHeaderLeft}>
              <MaterialIcons name="devices" size={28} color={colors.primary} />
              <View style={styles.deviceHeaderInfo}>
                <AppText variant="h2" style={styles.deviceName}>
                  {device.name || `Device ${device.device_id}`}
                </AppText>
                <AppText variant="h3" style={styles.sectionTitle}>
                  Device Details
                </AppText>
              </View>
            </View>
            <StatusBadge status={device.status} />
          </View>

          {/* Device Information */}
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <AppText variant="bodyBold" color={colors.textSecondary}>
              Information
            </AppText>
          </View>
          {renderDetailRow('fingerprint', 'Device ID', device.device_id)}
          {renderDetailRow('category', 'ID Type', idType?.toUpperCase())}
          {renderDetailRow('phone-android', 'IMEI', device.imei)}
          {renderDetailRow('memory', 'Serial Number', device.device_serial)}
          {renderDetailRow('tag', 'UUID', device.device_uuid)}
          {renderDetailRow('sim-card', 'SIM ICCID', device.sim_iccid)}
          {renderDetailRow('devices', 'Device Type', device.device_type)}
          {renderDetailRow('phone', 'Caller ID', device.caller_id)}
          {renderDetailRow('account-circle', 'CS Number', device.cs_no)}
          {renderDetailRow('build', 'Firmware Version', device.firmware_version)}
          {device.sim_status && (
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <AppText variant="body" color={colors.textSecondary} style={styles.detailLabel}>
                  SIM Status
                </AppText>
              </View>
              <AppText variant="bodyBold" style={styles.detailValue}>
                {device.sim_status}
              </AppText>
            </View>
          )}
          {renderDetailRow('business', 'Service Company', device.service_company?.toString())}
          {renderDetailRow('label', 'Custom Reference', device.custom_reference_field)}
          {renderDetailRow(
            'access-time',
            'Last Seen',
            formatLastSeen(lastUpdate ?? device.last_seen),
          )}
          {battery !== null && battery !== undefined && (
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <MaterialIcons name="battery-full" size={20} color={batteryColor} />
                <AppText variant="body" color={colors.textSecondary} style={styles.detailLabel}>
                  Battery Level
                </AppText>
              </View>
              <AppText variant="bodyBold" style={[styles.detailValue, { color: batteryColor }]}>
                {battery}%
              </AppText>
            </View>
          )}
          {/* Signal strength removed from detail row - now shown in DeviceStatusBar above */}
          {device.fall_detection_status && (
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <MaterialIcons name="shield" size={20} color={colors.green} />
                <AppText variant="body" color={colors.textSecondary} style={styles.detailLabel}>
                  Fall Detection Status
                </AppText>
              </View>
              <AppText variant="bodyBold" style={styles.detailValue}>
                {device.fall_detection_status}
              </AppText>
            </View>
          )}

          {/* Fall Detection */}
          <View style={styles.sectionDivider}>
            <View style={styles.fallDetectionHeader}>
              <View style={styles.fallDetectionInfo}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="shield" size={20} color={colors.green} />
                  <AppText variant="bodyBold" color={colors.textSecondary}>
                    Fall Detection
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.fallDetectionDesc}>
                  Enable automatic fall detection for this device.
                </AppText>
              </View>
              <Switch
                value={fallDetectionEnabled}
                onValueChange={handleToggleFallDetection}
                disabled={updating}
                trackColor={{ false: colors.border, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
            {updating && (
              <View style={styles.updatingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Updating...
                </AppText>
              </View>
            )}
          </View>

          {/* Device Signal */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="wifi-tethering" size={20} color={colors.primary} />
              <AppText variant="bodyBold" color={colors.textSecondary}>
                Device Signal
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textSecondary} style={styles.signalDesc}>
              Request the device to send a signal to verify connectivity.
            </AppText>
            <View style={styles.buttonContainer}>
              <Button
                label={requestingSignal ? 'Requesting...' : 'Request Signal'}
                onPress={handleRequestSignal}
                loading={requestingSignal}
                disabled={requestingSignal}
              />
            </View>
          </View>

          {/* Reports */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="description" size={20} color={colors.primary} />
              <AppText variant="bodyBold" color={colors.textSecondary}>
                Reports
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textSecondary} style={styles.reportDesc}>
              Download device reports containing vitals and health data.
            </AppText>
            <View style={styles.buttonContainer}>
              <Button
                label={downloadingReport ? 'Downloading...' : 'Download Report'}
                onPress={handleDownloadPress}
                loading={downloadingReport}
                disabled={downloadingReport}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  deviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  deviceHeaderInfo: {
    flex: 1,
  },
  deviceName: {
    marginBottom: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  loader: {
    marginTop: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorTitle: {
    marginTop: spacing.md,
    color: colors.error,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    textAlign: 'right',
    flex: 1,
  },
  fallDetectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  fallDetectionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  fallDetectionDesc: {
    marginTop: spacing.xs,
  },
  updatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  signalDesc: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  reportDesc: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  statusBarContainer: {
    marginBottom: spacing.md,
    marginTop: 0,
  },
  emptyTitle: {
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});

export default DeviceDetailsScreen;
