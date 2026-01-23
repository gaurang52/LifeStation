import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, DeviceCard } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { deviceApi, type Device } from '@core/api/deviceApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ROUTES } from '@core/constants/routes';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const DevicesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadDevices = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await deviceApi.getDevices(pageNum, 10);
      const newDevices = response.devices || [];

      if (isRefresh || pageNum === 1) {
        setDevices(newDevices);
      } else {
        setDevices(prev => [...prev, ...newDevices]);
      }

      if (response.pagination) {
        setHasMore(pageNum < response.pagination.totalPages);
      } else {
        setHasMore(newDevices.length === 10);
      }
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to load devices. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDevices(1);
  }, []);

  const handleRefresh = () => {
    setPage(1);
    loadDevices(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadDevices(nextPage);
    }
  };

  const handleDevicePress = (device: Device) => {
    navigation.navigate(ROUTES.DEVICE_DETAILS, {
      deviceId: device.device_id,
      idType: device.id_type,
    });
  };

  if (loading && devices.length === 0) {
    return (
      <Screen>
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

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="devices" size={28} color={colors.primary} />
          <AppText variant="h2" style={styles.headerTitle}>
            My Devices
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(ROUTES.ADD_DEVICE)}
          activeOpacity={0.7}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
          <AppText variant="bodyBold" color={colors.primary}>
            Add
          </AppText>
        </TouchableOpacity>
      </View>

      {error && devices.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Devices
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
          <Button label="Retry" onPress={() => loadDevices(1)} />
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices-other" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.emptyTitle}>
            No Devices Found
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Add your first device to get started with monitoring
          </AppText>
          <TouchableOpacity
            style={styles.addDeviceButton}
            onPress={() => navigation.navigate(ROUTES.ADD_DEVICE)}
            activeOpacity={0.7}>
            <MaterialIcons name="add-circle" size={24} color={colors.primary} />
            <AppText variant="bodyBold" color={colors.primary}>
              Add Device
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onScrollEndDrag={handleLoadMore}>
          {error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="info-outline" size={20} color={colors.warning} />
              <AppText variant="small" color={colors.warning} style={styles.errorBannerText}>
                {error}
              </AppText>
            </View>
          )}
          {devices.map(device => (
            <DeviceCard
              key={`${device.id_type}-${device.device_id}`}
              device={device}
              onPress={() => handleDevicePress(device)}
            />
          ))}
          {loading && devices.length > 0 && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0, // Allows text to shrink
  },
  headerTitle: {
    flex: 1,
    minWidth: 0, // Allows text to shrink and wrap if needed
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    flexShrink: 0, // Prevents button from shrinking
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  addDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    marginTop: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  errorBannerText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});

export default DevicesScreen;
