import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Card, TopNavbar, Input } from '@shared/components';
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
  const [fallDetectionToggling, setFallDetectionToggling] = useState(false);
  const [battery, setBattery] = useState<number | undefined>(undefined);
  const [signal, setSignal] = useState<number | undefined>(undefined);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [heartRate, setHeartRate] = useState<number | undefined>(undefined);
  const [steps, setSteps] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

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

        // Extract steps and heartrate from device data
        // Check if they exist as direct properties or in metadata
        const deviceWithAny = deviceData as Device & {
          steps?: number | null;
          heart_rate?: number | null;
          heartrate?: number | null;
          device_metadata?: {
            steps?: number | null;
            heart_rate?: number | null;
            heartrate?: number | null;
          };
        };

        // Try to get steps from direct property or metadata
        const stepsValue = deviceWithAny.steps ?? deviceWithAny.device_metadata?.steps ?? undefined;
        setSteps(stepsValue !== null && stepsValue !== undefined ? stepsValue : undefined);

        // Try to get heartrate from direct property or metadata (check both heart_rate and heartrate)
        const heartRateValue =
          deviceWithAny.heart_rate ??
          deviceWithAny.heartrate ??
          deviceWithAny.device_metadata?.heart_rate ??
          deviceWithAny.device_metadata?.heartrate ??
          undefined;
        setHeartRate(
          heartRateValue !== null && heartRateValue !== undefined ? heartRateValue : undefined,
        );

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
        // Reset steps and heartrate on error
        setSteps(undefined);
        setHeartRate(undefined);

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

  // Fall Detection is display-only (matching reference app - no toggle functionality)

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

  const handleOpenEditName = () => {
    setEditNameValue(device?.name || device?.device_id || '');
    setShowEditNameModal(true);
  };

  const handleSaveDeviceName = async () => {
    if (!deviceId || !idType) return;

    setUpdatingName(true);
    try {
      const trimmed = editNameValue.trim();
      await deviceApi.updateDeviceName(idType, deviceId, trimmed);
      setDevice(prev => (prev ? { ...prev, name: trimmed || null } : null));
      setShowEditNameModal(false);
      // Refresh to ensure backend state is reflected
      fetchedDeviceRecentId.current = null;
      await fetchDeviceRecent(true);
    } catch (err) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        ErrorHandler.getErrorMessage(err) ||
        'Failed to update device name.';
      Alert.alert('Update Failed', errMsg);
    } finally {
      setUpdatingName(false);
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

  if (loading && !device) {
    return (
      <Screen padded={false}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Device Details"
            subtitle="Loading..."
            variant="figma"
            showBackButton
            onBackPress={() => navigation.goBack()}
          />
        </View>
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

  if (error && !fetchingFirstDevice && !device) {
    return (
      <Screen padded={false}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Device Details"
            subtitle="Error"
            variant="figma"
            showBackButton
            onBackPress={() => navigation.goBack()}
          />
        </View>
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
        <Screen padded={false}>
          <View style={styles.navbarWrapper}>
            <TopNavbar
              title="Device Details"
              subtitle="No device"
              variant="figma"
              showBackButton
              onBackPress={() => navigation.goBack()}
            />
          </View>
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
      <Screen padded={false}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Device Details"
            subtitle="Not found"
            variant="figma"
            showBackButton
            onBackPress={() => navigation.goBack()}
          />
        </View>
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
      <View style={styles.navbarWrapper}>
        <TopNavbar
          title="Device Details"
          subtitle={device?.name || device?.device_id || 'Details'}
          variant="figma"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }>
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
            <View style={styles.statusGridItem}>
              <View style={styles.statusGridItemHeader}>
                <MaterialIcons name="favorite" size={20} color={colors.white} />
                <AppText variant="h3" style={styles.statusGridValue}>
                  {heartRate !== null && heartRate !== undefined ? `${heartRate}` : 'N/A'}
                </AppText>
              </View>
              <AppText variant="small" color="rgba(255, 255, 255, 0.7)">
                Heart Rate
              </AppText>
            </View>
            <View style={styles.statusGridItem}>
              <View style={styles.statusGridItemHeader}>
                <MaterialIcons name="directions-walk" size={20} color={colors.white} />
                <AppText variant="h3" style={styles.statusGridValue}>
                  {steps !== null && steps !== undefined ? `${steps}` : 'N/A'}
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

          {/* Edit Device Name - seniors can edit; caregivers see but cannot click */}
          <Card
            style={[styles.settingCard, user?.user_type !== 'senior' && styles.editNameDisabled]}>
            <TouchableOpacity
              style={styles.editNameRow}
              onPress={user?.user_type === 'senior' ? handleOpenEditName : undefined}
              disabled={user?.user_type !== 'senior'}
              activeOpacity={user?.user_type === 'senior' ? 0.7 : 1}>
              <View style={styles.editNameLeft}>
                <MaterialIcons
                  name="edit"
                  size={20}
                  color={user?.user_type === 'senior' ? colors.primary : colors.textSecondary}
                />
                <View>
                  <AppText
                    variant="bodyBold"
                    color={user?.user_type === 'senior' ? colors.text : colors.textSecondary}>
                    Device Name
                  </AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    {device?.name || 'Unnamed Device'}
                  </AppText>
                </View>
              </View>
              {user?.user_type === 'senior' && (
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </Card>

          {/* Fall Detection - Toggle (Device API PUT/DELETE falldetection) */}
          <Card style={styles.settingCard}>
            <View style={styles.fallDetectionHeader}>
              <View style={styles.fallDetectionInfo}>
                <View style={styles.fallDetectionTitleRow}>
                  <MaterialIcons
                    name="security"
                    size={20}
                    color={fallDetectionEnabled ? colors.green : colors.red}
                  />
                  <AppText variant="bodyBold" color={colors.text}>
                    Fall Detection
                  </AppText>
                </View>
                <AppText
                  variant="small"
                  color={colors.textSecondary}
                  style={styles.fallDetectionDesc}>
                  {fallDetectionEnabled ? 'Active' : 'Inactive'}
                </AppText>
              </View>
              <View style={styles.fallDetectionSwitchRow}>
                {fallDetectionToggling ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={fallDetectionEnabled}
                    onValueChange={async value => {
                      if (!idType || !deviceId) return;
                      setFallDetectionToggling(true);
                      try {
                        await deviceApi.toggleFallDetection(idType, deviceId, value);
                        setFallDetectionEnabled(value);
                      } catch (err) {
                        const msg =
                          ErrorHandler.getErrorMessage(err) || 'Failed to update fall detection';
                        Alert.alert('Error', msg);
                      } finally {
                        setFallDetectionToggling(false);
                      }
                    }}
                    trackColor={{ false: colors.divider, true: colors.lightPrimary }}
                    thumbColor={fallDetectionEnabled ? colors.primary : colors.textSecondary}
                    disabled={fallDetectionToggling}
                  />
                )}
              </View>
            </View>
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

      {/* Edit Device Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => !updatingName && setShowEditNameModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !updatingName && setShowEditNameModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={styles.modalTouchable}>
              <Card style={styles.editNameCard}>
                <AppText variant="h3" style={styles.editNameModalTitle}>
                  Edit Device Name
                </AppText>
                <Input
                  label="Device Name"
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  placeholder="e.g. Living Room, Bedroom"
                  autoCapitalize="words"
                  maxLength={255}
                  style={styles.editNameInput}
                />
                <View style={styles.editNameModalActions}>
                  <TouchableOpacity
                    style={styles.editNameCancelBtn}
                    onPress={() => !updatingName && setShowEditNameModal(false)}
                    disabled={updatingName}>
                    <AppText variant="body" color={colors.textSecondary}>
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                  <View style={styles.editNameSubmitWrap}>
                    <Button
                      label="Save"
                      onPress={handleSaveDeviceName}
                      loading={updatingName}
                      disabled={updatingName}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  navbarWrapper: {
    paddingTop: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  deviceCard: {
    backgroundColor: colors.primary, // Gradient-like solid color
    borderRadius: borderRadius.xl, // rounded-2xl in Figma
    padding: spacing.md,
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
    backgroundColor: colors.whiteOpacity20, // bg-white/20 in Figma
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
    backgroundColor: colors.whiteOpacity10, // bg-white/10 in Figma
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
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
  fallDetectionSwitchRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  editNameDisabled: {
    opacity: 0.7,
  },
  editNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  editNameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContentWrap: {
    width: '100%',
    maxWidth: 400,
  },
  modalTouchable: {
    width: '100%',
  },
  editNameCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  editNameModalTitle: {
    marginBottom: spacing.md,
    color: colors.text,
  },
  editNameInput: {
    marginBottom: spacing.lg,
  },
  editNameModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  editNameCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editNameSubmitWrap: {
    minWidth: 120,
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
