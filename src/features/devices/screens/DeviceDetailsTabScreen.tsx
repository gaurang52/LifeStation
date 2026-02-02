import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Card, DeviceCard, TopNavbar } from '@shared/components';
import { spacing, colors, borderRadius } from '@shared/theme';
import { deviceApi, type Device } from '@core/api/deviceApi';
import { reportsApi } from '@core/api/reportsApi';
import { useAuthStore } from '@core/store';
import { ErrorHandler } from '@core/utils/errorHandler';
import { downloadFile } from '@core/utils/fileDownloader';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ROUTES } from '@core/constants/routes';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const DeviceDetailsTabScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await deviceApi.getDevices();
      const deviceList = response.devices || [];
      setDevices(deviceList);
    } catch (err: unknown) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to load devices. Please try again.';
      setError(errorMessage);
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRefresh = () => {
    fetchDevices(true);
  };

  const handleDevicePress = (device: Device) => {
    if (device.id_type && device.device_id) {
      // Only navigate if id_type is supported by navigation (exclude 'iccid')
      if (device.id_type !== 'iccid') {
        navigation.navigate(ROUTES.DEVICE_DETAILS, {
          deviceId: device.device_id,
          idType: device.id_type as 'imei' | 'serial' | 'uuid',
        });
      }
    }
  };

  const handleDownloadReport = async (format: 'csv' | 'json' | 'pdf' = 'pdf') => {
    if (devices.length === 0) {
      Alert.alert('Error', 'No devices available. Please add a device first.');
      return;
    }

    // Use the first device for download (or could prompt user to select)
    const device = devices[0];
    if (!device.device_id || !device.id_type) {
      Alert.alert('Error', 'Device information incomplete. Please try again.');
      return;
    }

    try {
      setDownloading(true);

      // Use Recent Reports API endpoint from Postman collection
      const result = await reportsApi.downloadRecentReports(
        device.device_id,
        format,
        device.id_type,
      );

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
      setDownloading(false);
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

  // Loading state
  if (loading && devices.length === 0) {
    return (
      <Screen padded={false}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Devices"
            subtitle="Manage your registered devices"
            variant="figma"
            showBackButton={true}
            onBackPress={() => navigation.goBack()}
          />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices" size={64} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading devices...
          </AppText>
        </View>
      </Screen>
    );
  }

  // Error state
  if (error && devices.length === 0) {
    return (
      <Screen padded={false}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Devices"
            subtitle="Manage your registered devices"
            variant="figma"
            showBackButton={true}
            onBackPress={() => navigation.goBack()}
          />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Devices
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
          <Button label="Retry" onPress={() => fetchDevices()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.navbarWrapper}>
        <TopNavbar
          title="Devices"
          subtitle="Manage your registered devices"
          variant="figma"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          rightAction={
            devices.length > 0
              ? {
                  label: downloading ? 'Downloading...' : 'Download',
                  icon: downloading ? undefined : 'download',
                  onPress: handleDownloadPress,
                }
              : undefined
          }
        />
      </View>

      {/* Error Banner */}
      {error && devices.length > 0 && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="info-outline" size={20} color={colors.warning} />
          <AppText variant="small" color={colors.warning} style={styles.errorBannerText}>
            {error}
          </AppText>
        </View>
      )}

      {/* Empty State */}
      {devices.length === 0 ? (
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
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <AppText variant="small" color={colors.textSecondary} style={styles.sectionTitle}>
              REGISTERED DEVICES
            </AppText>
            <AppText variant="small" color={colors.textSecondary} style={styles.deviceCount}>
              {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </AppText>
          </View>

          {/* Device List */}
          {devices.map((device, index) => (
            <TouchableOpacity
              key={`${device.device_id}-${device.id_type}-${index}`}
              onPress={() => handleDevicePress(device)}
              activeOpacity={0.7}>
              <Card style={styles.deviceCard}>
                <DeviceCard device={device} />
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  navbarWrapper: {
    paddingTop: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deviceCount: {
    fontWeight: '500',
  },
  deviceCard: {
    marginBottom: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
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
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  errorBannerText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
});

export default DeviceDetailsTabScreen;
