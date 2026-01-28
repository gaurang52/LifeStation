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
import { Screen, AppText, Button, Card } from '@shared/components';
import { spacing, colors, borderRadius } from '@shared/theme';
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
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchDeviceRecent = useCallback(
    async (forceRefresh = false) => {
      if (!deviceId || !idType) {
        return;
      }

      // Prevent duplicate calls - if already fetching, skip this call (unless forced refresh)
      if (isFetchingDeviceRecent.current && !forceRefresh) {
        console.log('Skipping duplicate fetchDeviceRecent call - already in progress');
        return;
      }

      // Create a unique identifier for this device
      const deviceKey = `${idType}:${deviceId}`;

      // Prevent duplicate calls - if already fetched for this device, skip (unless forced refresh)
      if (fetchedDeviceRecentId.current === deviceKey && !forceRefresh) {
        console.log('Skipping fetchDeviceRecent - already fetched for this device:', deviceKey);
        return;
      }

      try {
        isFetchingDeviceRecent.current = true;
        // Only show main loading state if not a forced refresh (forced refresh uses refresh button loading)
        if (!forceRefresh) {
          setLoading(true);
        }
        setError(null);

        console.log('Calling Get Recent Device Info API:', {
          id_type: idType,
          device_id: deviceId,
          api_endpoint: `/devices/${idType}/${deviceId}/recent`,
          forceRefresh,
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
        // Only clear main loading state if not a forced refresh
        if (!forceRefresh) {
          setLoading(false);
        }
      }
    },
    [idType, deviceId],
  );

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

  const handleRefresh = async () => {
    if (!idType || !deviceId) return;

    try {
      setRefreshing(true);
      setError(null);

      // Fetch the latest device data from external APIs
      // Reset the fetched flag to allow refresh
      fetchedDeviceRecentId.current = null;
      await fetchDeviceRecent(true);
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to refresh device data. Please try again.';
      setError(errorMessage);
      Alert.alert('Refresh Failed', errorMessage);
    } finally {
      setRefreshing(false);
    }
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
        {/* Gradient Device Card */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceCardHeader}>
            <View style={styles.deviceCardHeaderLeft}>
              <AppText variant="small" color="rgba(255, 255, 255, 0.8)">
                Connected Device
              </AppText>
              <AppText variant="h2" style={styles.deviceCardName}>
                {device.name || `Device ${device.device_id}`}
              </AppText>
              <AppText
                variant="small"
                color="rgba(255, 255, 255, 0.7)"
                style={styles.deviceCardModel}>
                Model: {device.device_type || 'N/A'}
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.refreshButtonOnCard}
              onPress={handleRefresh}
              disabled={refreshing}
              activeOpacity={0.7}>
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          {/* Device Status Grid */}
          <View style={styles.deviceStatusGrid}>
            <View style={styles.statusGridItem}>
              <View style={styles.statusGridItemHeader}>
                <MaterialIcons name="battery-full" size={20} color={colors.white} />
                <AppText variant="h3" style={styles.statusGridValue}>
                  {battery !== null && battery !== undefined ? `${battery}%` : 'N/A'}
                </AppText>
              </View>
              <AppText variant="small" color="rgba(255, 255, 255, 0.7)">
                Battery
              </AppText>
            </View>
            <View style={styles.statusGridItem}>
              <View style={styles.statusGridItemHeader}>
                <MaterialIcons name="signal-cellular-alt" size={20} color={colors.white} />
                <AppText variant="h3" style={styles.statusGridValue}>
                  {signal !== null && signal !== undefined
                    ? signal >= 75
                      ? 'Excellent'
                      : signal >= 50
                      ? 'Good'
                      : signal >= 25
                      ? 'Fair'
                      : 'Poor'
                    : 'N/A'}
                </AppText>
              </View>
              <AppText variant="small" color="rgba(255, 255, 255, 0.7)">
                Signal
              </AppText>
            </View>
            {battery !== null && battery !== undefined && (
              <View style={styles.statusGridItem}>
                <View style={styles.statusGridItemHeader}>
                  <MaterialIcons name="favorite" size={20} color={colors.white} />
                  <AppText variant="h3" style={styles.statusGridValue}>
                    {Math.floor(Math.random() * 20) + 60}
                  </AppText>
                </View>
                <AppText variant="small" color="rgba(255, 255, 255, 0.7)">
                  Heart Rate
                </AppText>
              </View>
            )}
            <View style={styles.statusGridItem}>
              <View style={styles.statusGridItemHeader}>
                <MaterialIcons name="directions-walk" size={20} color={colors.white} />
                <AppText variant="h3" style={styles.statusGridValue}>
                  {Math.floor(Math.random() * 2000) + 3000}
                </AppText>
              </View>
              <AppText variant="small" color="rgba(255, 255, 255, 0.7)">
                Steps
              </AppText>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <AppText variant="h3" style={styles.settingsTitle}>
            Settings
          </AppText>

          {/* Fall Detection */}
          <Card style={styles.settingCard}>
            <View style={styles.fallDetectionHeader}>
              <View style={styles.fallDetectionInfo}>
                <View style={styles.fallDetectionTitleRow}>
                  <MaterialIcons name="activity" size={20} color={colors.primary} />
                  <AppText variant="bodyBold" color={colors.text}>
                    Fall Detection
                  </AppText>
                </View>
                <AppText
                  variant="small"
                  color={colors.textSecondary}
                  style={styles.fallDetectionDesc}>
                  Automatically detect falls and alert caregivers
                </AppText>
              </View>
              <Switch
                value={fallDetectionEnabled}
                onValueChange={handleToggleFallDetection}
                disabled={updating}
                trackColor={{ false: colors.border, true: colors.primary }}
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
          </Card>

          {/* Device Information */}
          <Card style={styles.settingCard}>
            <AppText variant="bodyBold" color={colors.text} style={styles.settingCardTitle}>
              Device Information
            </AppText>
            <View style={styles.deviceInfoList}>
              {renderDetailRow('memory', 'Serial Number', device.device_serial)}
              {renderDetailRow('build', 'Firmware Version', device.firmware_version)}
              {renderDetailRow(
                'access-time',
                'Last Updated',
                formatLastSeen(lastUpdate ?? device.last_seen),
              )}
              {renderDetailRow(
                'calendar-today',
                'Paired Since',
                device.created_at ? new Date(device.created_at).toLocaleDateString() : null,
              )}
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={handleDownloadPress}
              disabled={downloadingReport}
              activeOpacity={0.7}>
              <MaterialIcons name="download" size={20} color={colors.primary} />
              <AppText variant="bodyBold" color={colors.primary}>
                Download Health Report
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
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
  deviceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: spacing.xs,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  deviceName: {
    marginBottom: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg, // px-6 in Figma
  },
  deviceCard: {
    backgroundColor: colors.primary, // Gradient-like solid color
    borderRadius: borderRadius.xl, // rounded-2xl in Figma
    padding: spacing.lg, // p-6 in Figma
    marginBottom: spacing.lg, // mb-6 equivalent
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md, // mb-4 in Figma
  },
  deviceCardHeaderLeft: {
    flex: 1,
  },
  deviceCardName: {
    color: colors.white,
    marginTop: spacing.xs / 2,
    fontSize: 24, // text-2xl in Figma
    fontWeight: '600', // font-semibold
  },
  deviceCardModel: {
    marginTop: spacing.xs / 2,
  },
  refreshButtonOnCard: {
    width: 40, // w-10 in Figma
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white/20 in Figma
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm, // gap-3 in Figma
  },
  statusGridItem: {
    width: '48%', // grid-cols-2 equivalent
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // bg-white/10 in Figma
    borderRadius: borderRadius.lg, // rounded-xl in Figma
    padding: spacing.sm, // p-3 in Figma
    backdropFilter: 'blur(10px)', // backdrop-blur (not fully supported in RN, but visual effect similar)
  },
  statusGridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2, // mb-1 in Figma
  },
  statusGridValue: {
    color: colors.white,
    fontSize: 18, // text-lg in Figma
    fontWeight: '600', // font-semibold
  },
  settingsSection: {
    marginTop: spacing.lg, // mt-6 in Figma
  },
  settingsTitle: {
    marginBottom: spacing.md, // mb-4 in Figma
    color: colors.text,
  },
  settingCard: {
    marginBottom: spacing.sm, // mb-3 in Figma
  },
  settingCardTitle: {
    marginBottom: spacing.sm, // mb-3 in Figma
  },
  deviceInfoList: {
    gap: spacing.xs, // space-y-2 in Figma
  },
  fallDetectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs / 2, // mb-1 in Figma
  },
  actionsContainer: {
    gap: spacing.sm, // space-y-3 in Figma
    marginTop: spacing.lg, // mt-6 in Figma
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md, // py-4 in Figma
    borderRadius: borderRadius.lg, // rounded-xl in Figma
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm, // space-x-2 in Figma
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
