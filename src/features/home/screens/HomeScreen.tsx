import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Card } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors, borderRadius } from '@shared/theme';
import { deviceApi, type Device } from '@core/api/deviceApi';
import { eventsApi, type DeviceEvent } from '@core/api/eventsApi';
import { caregiverApi } from '@core/api/caregiverApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { logger } from '@core/utils/logger';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ROUTES } from '@core/constants/routes';
import moment from 'moment';

type NavigationProp = StackNavigationProp<AppStackParamList>;

interface DeviceRecentInfo {
  device: Device;
  battery?: number;
  fallDetection?: boolean;
  signal?: number;
  lastUpdate?: string;
  location?: {
    latitude: number;
    longitude: number;
    timestamp?: string | null;
  } | null;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceRecentInfo | null>(null);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpSuccess, setHelpSuccess] = useState<string | null>(null);
  const [helpError, setHelpError] = useState<string | null>(null);
  const hasInitialFetch = useRef(false);
  const helpDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingDevices = useRef(false); // Track if fetch is in progress to prevent duplicate calls
  const hasFetchedDevices = useRef(false); // Track if devices have been fetched to prevent duplicate calls
  const isFetchingDeviceRecent = useRef(false); // Track if Get Recent Device Info is in progress
  const fetchedDeviceRecentId = useRef<string | null>(null); // Track which device we've already fetched recent info for

  const fetchDevices = useCallback(async (isRefresh = false) => {
    // Prevent duplicate calls - if already fetching, skip this call
    if (isFetchingDevices.current && !isRefresh) {
      console.log('Skipping duplicate fetchDevices call - already in progress');
      return;
    }

    // Prevent duplicate calls on initial mount - only fetch once unless it's a manual refresh
    if (hasFetchedDevices.current && !isRefresh) {
      console.log('Skipping duplicate fetchDevices call - already fetched devices');
      return;
    }

    try {
      isFetchingDevices.current = true;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await deviceApi.getDevices(1, 1);
      const deviceList = response.devices || [];
      setDevices(deviceList);

      if (deviceList.length > 0) {
        // Always set the first device as active, even if one already exists
        // This ensures we refresh the device data
        setActiveDevice(deviceList[0]);
      } else {
        setActiveDevice(null);
        setDeviceInfo(null);
      }

      // Mark devices as fetched
      hasFetchedDevices.current = true;
    } catch (err: unknown) {
      const errorDetails = err as {
        statusCode?: number;
        message?: string;
        originalError?: { response?: { data?: { retryAfter?: number } } };
      };
      let errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to load devices. Please try again.';

      // Handle rate limit errors specifically with retryAfter information
      if (errorDetails.statusCode === 429) {
        const retryAfter = errorDetails.originalError?.response?.data?.retryAfter;
        if (retryAfter) {
          const minutes = Math.ceil(retryAfter / 60);
          errorMessage = `Too many requests. Please try again in ${minutes} minute${
            minutes !== 1 ? 's' : ''
          }.`;
          console.warn(
            `Rate limit exceeded (429) - retry after ${retryAfter} seconds (${minutes} minutes)`,
          );
        } else {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
          console.warn('Rate limit exceeded (429) - waiting before retry');
        }
      }

      setError(errorMessage);
      console.error('Error fetching devices:', err);
      setActiveDevice(null);
      setDeviceInfo(null);

      // Mark as fetched even on error to prevent retry loops
      // This prevents useFocusEffect from continuously retrying on errors
      // User can manually refresh if needed
      if (!isRefresh) {
        hasFetchedDevices.current = true;
      }
    } finally {
      isFetchingDevices.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDeviceRecent = useCallback(async (device: Device) => {
    if (!device) {
      console.warn('Device is null or undefined');
      return;
    }

    // Create a unique identifier for this device (for tracking purposes)
    const deviceIdentifier =
      device.device_id ||
      device.imei ||
      device.device_serial ||
      device.device_uuid ||
      device.sim_iccid;
    const deviceKey =
      device.id_type && deviceIdentifier ? `${device.id_type}:${deviceIdentifier}` : null;

    // Prevent duplicate calls - if already fetching or already fetched for this device, skip
    if (isFetchingDeviceRecent.current) {
      console.log('Skipping duplicate fetchDeviceRecent call - already in progress');
      return;
    }

    if (deviceKey && fetchedDeviceRecentId.current === deviceKey) {
      console.log('Skipping fetchDeviceRecent - already fetched for this device:', deviceKey);
      return;
    }

    // Determine which id_type and device_id to use for the API call
    // API format: /devices/{id_type}/{device_id}/recent
    // Example: /devices/imei/861475032341820/recent
    const idType: Device['id_type'] | 'iccid' | null = device.id_type || null;
    let deviceId: string | null = device.device_id || null;

    console.log('Initial device data:', {
      id_type: idType,
      device_id: deviceId,
      imei: device.imei,
      device_serial: device.device_serial,
      device_uuid: device.device_uuid,
      sim_iccid: device.sim_iccid,
    });

    // If device_id is missing, try to infer it from id_type-specific fields
    if (!deviceId && idType) {
      if (idType === 'imei' && device.imei) {
        deviceId = device.imei;
        console.log('✓ Using imei field as device_id for API call:', {
          id_type: idType,
          device_id: deviceId,
          api_url: `/devices/${idType}/${deviceId}/recent`,
        });
      } else if (idType === 'serial' && device.device_serial) {
        deviceId = device.device_serial;
        console.log('✓ Using device_serial field as device_id for API call:', {
          id_type: idType,
          device_id: deviceId,
          api_url: `/devices/${idType}/${deviceId}/recent`,
        });
      } else if (idType === 'uuid' && device.device_uuid) {
        deviceId = device.device_uuid;
        console.log('✓ Using device_uuid field as device_id for API call:', {
          id_type: idType,
          device_id: deviceId,
          api_url: `/devices/${idType}/${deviceId}/recent`,
        });
      } else if (idType === 'iccid' && device.sim_iccid) {
        deviceId = device.sim_iccid;
        console.log('✓ Using sim_iccid field as device_id for API call:', {
          id_type: idType,
          device_id: deviceId,
          api_url: `/devices/${idType}/${deviceId}/recent`,
        });
      }
    }

    // If device has sim_iccid but id_type is not iccid, try using iccid
    if (device.sim_iccid && (!idType || idType !== 'iccid')) {
      console.log('Device has sim_iccid, will try iccid as fallback:', {
        current_id_type: idType,
        sim_iccid: device.sim_iccid,
      });
    }

    if (!idType || !deviceId) {
      console.warn('Device missing required fields (id_type or device_id):', {
        id_type: idType,
        device_id: deviceId,
        imei: device.imei,
        sim_iccid: device.sim_iccid,
        device: device,
      });
      // Set deviceInfo with basic device data even if we can't fetch recent info
      setDeviceInfo({
        device,
        battery: device.battery_level || undefined,
        signal: device.signal_strength || undefined,
        lastUpdate: device.last_seen || undefined,
        location: device.location || undefined,
      });
      return;
    }

    try {
      isFetchingDeviceRecent.current = true;
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
        location: deviceData.location,
        last_seen: deviceData.last_seen,
      });

      let fallDetection = false;
      try {
        const fallResponse = await deviceApi.getFallDetection(idType, deviceId);
        fallDetection = fallResponse.fall_detection_enabled || false;
      } catch (e) {
        console.warn('Failed to fetch fall detection:', e);
      }

      const deviceInfoData = {
        device: deviceData,
        battery: deviceData.battery_level || undefined,
        fallDetection,
        signal: deviceData.signal_strength || undefined,
        lastUpdate: deviceData.last_seen || undefined,
        location: deviceData.location || undefined,
      };

      console.log('Setting deviceInfo:', deviceInfoData);
      setDeviceInfo(deviceInfoData);

      // Mark this device as fetched
      if (deviceKey) {
        fetchedDeviceRecentId.current = deviceKey;
      }
    } catch (err) {
      console.error('Error fetching device recent info:', err);
      const errorMessage = (err as { message?: string })?.message || '';
      const errorDetails = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      console.error('Error details:', {
        message: errorMessage,
        status: errorDetails.response?.status,
        data: errorDetails.response?.data,
        fullError: err,
      });

      // If the call failed and device has sim_iccid, try using iccid as id_type
      if (device.sim_iccid && idType !== 'iccid') {
        console.log('Retrying with iccid:', {
          sim_iccid: device.sim_iccid,
          original_id_type: idType,
        });

        try {
          const retryResponse = await deviceApi.getDeviceRecent('iccid', device.sim_iccid);
          const retryDeviceData = retryResponse.device;

          console.log('Successfully fetched with iccid:', retryDeviceData);

          let fallDetection = false;
          try {
            const fallResponse = await deviceApi.getFallDetection('iccid', device.sim_iccid);
            fallDetection = fallResponse.fall_detection_enabled || false;
          } catch (e) {
            console.warn('Failed to fetch fall detection with iccid:', e);
          }

          const deviceInfoData = {
            device: retryDeviceData,
            battery: retryDeviceData.battery_level || undefined,
            fallDetection,
            signal: retryDeviceData.signal_strength || undefined,
            lastUpdate: retryDeviceData.last_seen || undefined,
            location: retryDeviceData.location || undefined,
          };

          console.log('Setting deviceInfo from iccid retry:', deviceInfoData);
          setDeviceInfo(deviceInfoData);
          return;
        } catch (retryErr) {
          console.error('Retry with iccid also failed:', retryErr);
        }
      }

      // Even if fetchDeviceRecent fails, set deviceInfo with basic device data
      // This prevents infinite loading state
      setDeviceInfo({
        device,
        battery: device.battery_level || undefined,
        signal: device.signal_strength || undefined,
        lastUpdate: device.last_seen || undefined,
        location: device.location || undefined,
      });

      if (!errorMessage.includes('Access denied')) {
        console.warn('Could not fetch device details:', errorMessage);
      }
    } finally {
      isFetchingDeviceRecent.current = false;
    }
  }, []);

  const fetchEvents = useCallback(async (device: Device) => {
    if (!device || !device.device_id) return;

    try {
      const response = await eventsApi.getEvents(device.device_id, 'last_7_days');
      const eventList = response.data || [];
      eventList.sort((a, b) => {
        const timeA = new Date(a.eventtime).getTime();
        const timeB = new Date(b.eventtime).getTime();
        return timeB - timeA;
      });
      setEvents(eventList.slice(0, 10));
    } catch (err) {
      console.warn('Error fetching events:', err);
    }
  }, []);

  // Initial fetch on component mount - ensures API is called even on auto-login
  // This handles cases where user auto-logs in and Home screen is already mounted
  // Only called ONCE on initial mount
  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      // Only fetch if not already fetched (prevents duplicate calls)
      if (!hasFetchedDevices.current) {
        fetchDevices();
      }
    }
  }, [fetchDevices]);

  // Also fetch when screen comes into focus (e.g., when navigating back to Home)
  // This ensures fresh data when user returns to Home screen
  // Skip on initial mount to avoid duplicate call (useEffect handles initial mount)
  // Only fetch if devices haven't been fetched yet
  useFocusEffect(
    useCallback(() => {
      // Only fetch if:
      // 1. Initial mount has completed (hasInitialFetch.current is true)
      // 2. Devices haven't been fetched yet (hasFetchedDevices.current is false)
      // 3. Not currently loading or fetching (to prevent duplicate calls)
      // This prevents duplicate API calls that cause rate limit errors
      if (
        hasInitialFetch.current &&
        !hasFetchedDevices.current &&
        !loading &&
        !isFetchingDevices.current
      ) {
        fetchDevices();
      }
    }, [fetchDevices, loading]),
  );

  // Automatically call Get Recent Device Info API when active device is set
  // This happens after fetchDevices() completes and sets the activeDevice
  // Only called ONCE per device to prevent duplicate API calls
  useEffect(() => {
    if (activeDevice && activeDevice.id_type && activeDevice.device_id) {
      const deviceId =
        activeDevice.device_id ||
        activeDevice.imei ||
        activeDevice.device_serial ||
        activeDevice.device_uuid ||
        activeDevice.sim_iccid;
      const deviceKey =
        activeDevice.id_type && deviceId ? `${activeDevice.id_type}:${deviceId}` : null;

      // Only fetch if we haven't already fetched for this device
      if (deviceKey && fetchedDeviceRecentId.current !== deviceKey) {
        console.log('Active device has required fields, fetching recent info:', {
          id_type: activeDevice.id_type,
          device_id: activeDevice.device_id,
          device: activeDevice,
        });
        // Automatically call Get Recent Device Info API as part of post-login flow
        // This will only be called ONCE per device
        fetchDeviceRecent(activeDevice);
        fetchEvents(activeDevice);
      } else if (deviceKey && fetchedDeviceRecentId.current === deviceKey) {
        console.log('Skipping fetchDeviceRecent - already fetched for device:', deviceKey);
      }
    } else if (activeDevice) {
      // If device exists but missing required fields, set deviceInfo with basic data
      console.warn('Active device missing required fields, using basic data:', {
        id_type: activeDevice.id_type,
        device_id: activeDevice.device_id,
        device: activeDevice,
      });
      setDeviceInfo({
        device: activeDevice,
        battery: activeDevice.battery_level || undefined,
        signal: activeDevice.signal_strength || undefined,
        lastUpdate: activeDevice.last_seen || undefined,
        location: activeDevice.location || undefined,
      });
    } else {
      console.log('No active device, clearing deviceInfo');
      setDeviceInfo(null);
    }
  }, [activeDevice, fetchDeviceRecent, fetchEvents]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset the fetched flags so we can fetch again on manual refresh
    fetchedDeviceRecentId.current = null;
    hasFetchedDevices.current = false;
    await fetchDevices(true);
    if (activeDevice && activeDevice.id_type && activeDevice.device_id) {
      await fetchDeviceRecent(activeDevice);
      await fetchEvents(activeDevice);
    }
    setRefreshing(false);
  }, [fetchDevices, activeDevice, fetchDeviceRecent, fetchEvents]);

  const handleHelp = useCallback(async () => {
    // Debounce: prevent rapid repeated presses
    if (helpLoading) {
      return;
    }

    // Clear any existing timer
    if (helpDebounceTimer.current) {
      clearTimeout(helpDebounceTimer.current);
    }

    // Clear previous messages
    setHelpSuccess(null);
    setHelpError(null);

    try {
      setHelpLoading(true);
      const response = await caregiverApi.sendHelpNotification();

      // Show success message
      const successMessage = `Help notification sent to ${
        response.data.notifications.sent
      } caregiver${response.data.notifications.sent !== 1 ? 's' : ''}`;
      setHelpSuccess(successMessage);

      // Clear success message after 3 seconds
      helpDebounceTimer.current = setTimeout(() => {
        setHelpSuccess(null);
      }, 3000);

      logger.info('Help notification sent successfully:', response);
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to send help notification. Please try again.';
      setHelpError(errorMessage);

      // Clear error message after 5 seconds
      helpDebounceTimer.current = setTimeout(() => {
        setHelpError(null);
      }, 5000);

      logger.error('Error sending help notification:', err);
    } finally {
      setHelpLoading(false);
    }
  }, [helpLoading]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (helpDebounceTimer.current) {
        clearTimeout(helpDebounceTimer.current);
      }
    };
  }, []);

  const formatEventTime = (eventTime: string): string => {
    try {
      return moment(eventTime).utc().local().format('MMM DD yyyy hh:mm:ss A');
    } catch {
      return eventTime;
    }
  };

  const getEventIcon = (eventType: string): string => {
    const type = eventType?.toLowerCase() || '';
    if (type.includes('location')) return 'location-on';
    if (type.includes('telemetry')) return 'show-chart';
    if (type.includes('fall')) return 'warning';
    if (type.includes('alert')) return 'notifications';
    return 'event';
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading...
          </AppText>
        </View>
      );
    }

    if (devices.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices-other" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.errorTitle}>
            No Devices Found
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorMessage}>
            Add your first device to get started with monitoring.
          </AppText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate(ROUTES.ADD_DEVICE)}
            activeOpacity={0.7}>
            <MaterialIcons name="add" size={20} color={colors.primary} />
            <AppText variant="bodyBold" color={colors.primary}>
              Add Device
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    // Show loading only if we're still loading and have a device but no deviceInfo yet
    if (activeDevice && !deviceInfo && loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading device information...
          </AppText>
        </View>
      );
    }

    // If we have a device but deviceInfo failed to load after loading completes,
    // show content anyway using basic device data
    if (activeDevice && !deviceInfo && !loading) {
      // Use basic device data as fallback
      return (
        <>
          {/* Device Details Section */}
          <Card style={styles.deviceDetailsCard}>
            {/* Device Name and User Name */}
            <View style={styles.deviceDetailsContent}>
              <View style={styles.deviceDetailItem}>
                <MaterialIcons name="devices" size={20} color={colors.primary} />
                <View style={styles.deviceDetailText}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Device Name
                  </AppText>
                  <AppText variant="bodyBold">{activeDevice.name || 'Unnamed Device'}</AppText>
                </View>
              </View>
              <View style={styles.deviceDetailItem}>
                <MaterialIcons name="person" size={20} color={colors.primary} />
                <View style={styles.deviceDetailText}>
                  <AppText variant="small" color={colors.textSecondary}>
                    User Name
                  </AppText>
                  <AppText variant="bodyBold">{user?.name || 'Unknown User'}</AppText>
                </View>
              </View>
            </View>

            {/* Extended Device Details */}
            <View style={styles.deviceDetailsGrid}>
              {activeDevice.device_id && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Device ID
                  </AppText>
                  <AppText variant="body">{activeDevice.device_id}</AppText>
                </View>
              )}
              {activeDevice.imei && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    IMEI
                  </AppText>
                  <AppText variant="body">{activeDevice.imei}</AppText>
                </View>
              )}
              {activeDevice.status && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Device Status
                  </AppText>
                  <AppText variant="body" style={styles.statusText}>
                    {activeDevice.status}
                  </AppText>
                </View>
              )}
              {activeDevice.caller_id && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Caller ID
                  </AppText>
                  <AppText variant="body">{activeDevice.caller_id}</AppText>
                </View>
              )}
              {activeDevice.cs_no && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    CS Number
                  </AppText>
                  <AppText variant="body">{activeDevice.cs_no}</AppText>
                </View>
              )}
              {activeDevice.firmware_version && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Firmware Version
                  </AppText>
                  <AppText variant="body">{activeDevice.firmware_version}</AppText>
                </View>
              )}
              {activeDevice.sim_iccid && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    SIM ICCID
                  </AppText>
                  <AppText variant="body">{activeDevice.sim_iccid}</AppText>
                </View>
              )}
              {activeDevice.sim_status && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    SIM Status
                  </AppText>
                  <AppText variant="body" style={styles.statusText}>
                    {activeDevice.sim_status}
                  </AppText>
                </View>
              )}
              {activeDevice.fall_detection_status && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Fall Detection Status
                  </AppText>
                  <AppText variant="body" style={styles.statusText}>
                    {activeDevice.fall_detection_status}
                  </AppText>
                </View>
              )}
              {activeDevice.service_company && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Service Company
                  </AppText>
                  <AppText variant="body">{activeDevice.service_company}</AppText>
                </View>
              )}
              {activeDevice.custom_reference_field && (
                <View style={styles.deviceDetailRow}>
                  <AppText variant="small" color={colors.textSecondary}>
                    Custom Reference
                  </AppText>
                  <AppText variant="body">{activeDevice.custom_reference_field}</AppText>
                </View>
              )}
            </View>
          </Card>

          {/* TODO: Temporarily commented out - uncomment after fixing Google Maps API key configuration
          <MapViewComponent
            latitude={location.latitude}
            longitude={location.longitude}
            height={250}
            showMarker={true}
            markerTitle="Device Location"
          />
          */}
          <Card style={styles.eventsCard}>
            <View style={styles.eventsHeader}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <AppText variant="h3" style={styles.eventsTitle}>
                Recent Events
              </AppText>
            </View>
            {events.length > 0 ? (
              <FlatList
                data={events}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const eventType = item.eventtype || 'Unknown Event';
                  const iconName = getEventIcon(eventType);
                  return (
                    <View style={styles.eventItem}>
                      <MaterialIcons name={iconName} size={18} color={colors.primary} />
                      <View style={styles.eventContent}>
                        <AppText variant="body" style={styles.eventTitle}>
                          {eventType}
                        </AppText>
                        <AppText
                          variant="small"
                          color={colors.textSecondary}
                          style={styles.eventDate}>
                          {formatEventTime(item.eventtime)}
                        </AppText>
                      </View>
                    </View>
                  );
                }}
                keyExtractor={(item, index) => `event-${index}-${item.eventtime}`}
              />
            ) : (
              <AppText variant="body" color={colors.textSecondary} style={styles.noEvents}>
                No events found
              </AppText>
            )}
          </Card>
        </>
      );
    }

    // If no device or deviceInfo, return null (handled by outer conditions)
    if (!activeDevice || !deviceInfo) {
      return null;
    }

    return (
      <>
        {/* Device Details Section */}
        <Card style={styles.deviceDetailsCard}>
          {/* Device Name and User Name */}
          <View style={styles.deviceDetailsContent}>
            <View style={styles.deviceDetailItem}>
              <MaterialIcons name="devices" size={20} color={colors.primary} />
              <View style={styles.deviceDetailText}>
                <AppText variant="small" color={colors.textSecondary}>
                  Device Name
                </AppText>
                <AppText variant="bodyBold">{activeDevice.name || 'Unnamed Device'}</AppText>
              </View>
            </View>
            <View style={styles.deviceDetailItem}>
              <MaterialIcons name="person" size={20} color={colors.primary} />
              <View style={styles.deviceDetailText}>
                <AppText variant="small" color={colors.textSecondary}>
                  User Name
                </AppText>
                <AppText variant="bodyBold">{user?.name || 'Unknown User'}</AppText>
              </View>
            </View>
          </View>

          {/* Extended Device Details */}
          <View style={styles.deviceDetailsGrid}>
            {activeDevice.device_id && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Device ID
                </AppText>
                <AppText variant="body">{activeDevice.device_id}</AppText>
              </View>
            )}
            {activeDevice.imei && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  IMEI
                </AppText>
                <AppText variant="body">{activeDevice.imei}</AppText>
              </View>
            )}
            {activeDevice.status && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Device Status
                </AppText>
                <AppText variant="body" style={styles.statusText}>
                  {activeDevice.status}
                </AppText>
              </View>
            )}
            {activeDevice.caller_id && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Caller ID
                </AppText>
                <AppText variant="body">{activeDevice.caller_id}</AppText>
              </View>
            )}
            {activeDevice.cs_no && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  CS Number
                </AppText>
                <AppText variant="body">{activeDevice.cs_no}</AppText>
              </View>
            )}
            {activeDevice.firmware_version && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Firmware Version
                </AppText>
                <AppText variant="body">{activeDevice.firmware_version}</AppText>
              </View>
            )}
            {activeDevice.sim_iccid && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  SIM ICCID
                </AppText>
                <AppText variant="body">{activeDevice.sim_iccid}</AppText>
              </View>
            )}
            {activeDevice.sim_status && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  SIM Status
                </AppText>
                <AppText variant="body" style={styles.statusText}>
                  {activeDevice.sim_status}
                </AppText>
              </View>
            )}
            {activeDevice.fall_detection_status && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Fall Detection Status
                </AppText>
                <AppText variant="body" style={styles.statusText}>
                  {activeDevice.fall_detection_status}
                </AppText>
              </View>
            )}
            {activeDevice.service_company && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Service Company
                </AppText>
                <AppText variant="body">{activeDevice.service_company}</AppText>
              </View>
            )}
            {activeDevice.custom_reference_field && (
              <View style={styles.deviceDetailRow}>
                <AppText variant="small" color={colors.textSecondary}>
                  Custom Reference
                </AppText>
                <AppText variant="body">{activeDevice.custom_reference_field}</AppText>
              </View>
            )}
          </View>
        </Card>

        {/* Recent Events Section */}
        <Card style={styles.eventsCard}>
          <View style={styles.eventsHeader}>
            <MaterialIcons name="event" size={20} color={colors.primary} />
            <AppText variant="h3" style={styles.eventsTitle}>
              Recent Events
            </AppText>
          </View>
          {events.length > 0 ? (
            <FlatList
              data={events}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const eventType = item.eventtype || 'Unknown Event';
                const iconName = getEventIcon(eventType);
                return (
                  <View style={styles.eventItem}>
                    <MaterialIcons name={iconName} size={18} color={colors.primary} />
                    <View style={styles.eventContent}>
                      <AppText variant="body" style={styles.eventTitle}>
                        {eventType}
                      </AppText>
                      <AppText
                        variant="small"
                        color={colors.textSecondary}
                        style={styles.eventDate}>
                        {formatEventTime(item.eventtime)}
                      </AppText>
                    </View>
                  </View>
                );
              }}
              keyExtractor={(item, index) => `event-${index}-${item.eventtime}`}
            />
          ) : (
            <AppText variant="body" color={colors.textSecondary} style={styles.noEvents}>
              No events found
            </AppText>
          )}
        </Card>
      </>
    );
  };

  return (
    <Screen padded={false}>
      {error && devices.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Devices
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorMessage}>
            {error}
          </AppText>
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
          }>
          {/* Header with gradient background */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <AppText
                  variant="small"
                  color="rgba(255, 255, 255, 0.8)"
                  style={styles.welcomeText}>
                  Welcome back
                </AppText>
                <AppText variant="h2" style={styles.userName}>
                  {user?.name || 'User'}
                </AppText>
              </View>
              <View style={styles.headerButtons}>
                {user?.user_type === 'senior' && (
                  <TouchableOpacity
                    style={[styles.helpButton, helpLoading && styles.buttonDisabled]}
                    onPress={handleHelp}
                    activeOpacity={0.7}
                    disabled={helpLoading}>
                    <AppText
                      variant="bodyBold"
                      color={colors.white}
                      style={helpLoading && styles.buttonTextDisabled}>
                      Help
                    </AppText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={handleRefresh}
                  activeOpacity={0.7}>
                  <MaterialIcons
                    name="refresh"
                    size={20}
                    color={colors.white}
                    style={refreshing && styles.refreshIconSpinning}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Device Status Bar on colored background */}
            {activeDevice && (
              <View style={styles.statusBarWrapper}>
                <View style={styles.statusBarOnHeader}>
                  <View style={styles.statusBarTop}>
                    <View>
                      <AppText variant="small" color={colors.textSecondary}>
                        Device
                      </AppText>
                      <AppText variant="bodyBold" color={colors.text} style={styles.deviceName}>
                        {activeDevice.name || 'Unnamed Device'}
                      </AppText>
                    </View>
                    <View style={styles.statusIndicators}>
                      {deviceInfo?.battery !== undefined && (
                        <>
                          <View style={styles.statusIndicator}>
                            <MaterialIcons
                              name="battery-full"
                              size={16}
                              color={
                                deviceInfo.battery >= 50
                                  ? colors.battery
                                  : deviceInfo.battery >= 20
                                  ? colors.warning
                                  : colors.red
                              }
                            />
                            <AppText variant="small" color={colors.text} style={styles.statusText}>
                              {deviceInfo.battery}%
                            </AppText>
                          </View>
                          <View style={styles.statusDot} />
                        </>
                      )}
                      {deviceInfo?.signal !== undefined && (
                        <View style={styles.statusIndicator}>
                          <MaterialIcons
                            name="signal-cellular-alt"
                            size={16}
                            color={colors.primary}
                          />
                          <AppText variant="small" color={colors.text} style={styles.statusText}>
                            {deviceInfo.signal >= 75
                              ? 'Excellent'
                              : deviceInfo.signal >= 50
                              ? 'Good'
                              : deviceInfo.signal >= 25
                              ? 'Fair'
                              : 'Poor'}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statusBarBottom}>
                    <MaterialIcons name="access-time" size={16} color={colors.textSecondary} />
                    <AppText
                      variant="small"
                      color={colors.textSecondary}
                      style={styles.lastSyncText}>
                      Last sync:{' '}
                      {deviceInfo?.lastUpdate
                        ? (() => {
                            try {
                              const date = new Date(deviceInfo.lastUpdate);
                              const now = new Date();
                              const diffMs = now.getTime() - date.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              if (diffMins < 1) return 'Just now';
                              if (diffMins < 60) return `${diffMins} minutes ago`;
                              const diffHours = Math.floor(diffMs / 3600000);
                              if (diffHours < 24) return `${diffHours} hours ago`;
                              return date.toLocaleDateString();
                            } catch {
                              return 'Unknown';
                            }
                          })()
                        : 'Never'}
                    </AppText>
                  </View>
                </View>
              </View>
            )}
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="info-outline" size={20} color={colors.warning} />
              <AppText variant="small" color={colors.warning} style={styles.errorBannerText}>
                {error}
              </AppText>
            </View>
          )}
          {helpSuccess && (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={20} color={colors.success || '#10b981'} />
              <AppText
                variant="small"
                color={colors.success || '#10b981'}
                style={styles.successBannerText}>
                {helpSuccess}
              </AppText>
            </View>
          )}
          {helpError && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={20} color={colors.error || colors.red} />
              <AppText
                variant="small"
                color={colors.error || colors.red}
                style={styles.errorBannerText}>
                {helpError}
              </AppText>
            </View>
          )}
          <View style={styles.paddedContent}>{renderContent()}</View>
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  header: {
    backgroundColor: colors.primary, // Gradient-like solid color
    paddingHorizontal: spacing.lg, // px-6 in Figma
    paddingTop: spacing.xxl, // pt-12 in Figma
    paddingBottom: spacing.lg, // pb-6 in Figma
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg, // mb-6 in Figma
  },
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  welcomeText: {
    marginBottom: spacing.xs / 2, // mt-1 equivalent
  },
  userName: {
    color: colors.white,
    marginTop: spacing.xs / 2,
    fontSize: 24, // text-2xl in Figma
    fontWeight: '600', // font-semibold
  },
  helpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.whiteOpacity20, // bg-white/20 in Figma
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  refreshButton: {
    width: 40, // w-10 in Figma
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.whiteOpacity20, // bg-white/20 in Figma
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  refreshIconSpinning: {
    transform: [{ rotate: '180deg' }], // Simple rotation, could be animated
  },
  statusBarWrapper: {
    marginTop: 0,
  },
  statusBarOnHeader: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl, // rounded-2xl in Figma
    padding: spacing.md, // p-4 in Figma
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm, // mb-3 in Figma
  },
  deviceName: {
    marginTop: spacing.xs / 2,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // space-x-2 in Figma
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2, // mr-1 equivalent
  },
  statusText: {
    fontWeight: '500', // font-medium
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
  statusBarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2, // mr-1 equivalent
  },
  lastSyncText: {
    fontSize: 14, // text-sm in Figma
  },
  paddedContent: {
    padding: spacing.lg, // px-6 in Figma
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    minHeight: 400,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: colors.error,
  },
  errorMessage: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    gap: spacing.xs,
  },
  // eslint-disable-next-line react-native/no-color-literals
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb', // Light yellow/amber warning background
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  errorBannerText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successBannerText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  eventsCard: {
    marginTop: spacing.md,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  eventContent: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  eventTitle: {
    fontWeight: '500',
  },
  eventDate: {
    fontSize: 11,
  },
  noEvents: {
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  deviceDetailsCard: {
    marginBottom: spacing.md,
  },
  deviceDetailsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#e0e0e0',
  },
  deviceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  deviceDetailText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  // TODO: Uncomment when device details header/title are used
  // eslint-disable-next-line react-native/no-unused-styles
  deviceDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  // eslint-disable-next-line react-native/no-unused-styles
  deviceDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceDetailsGrid: {
    gap: spacing.md,
  },
  deviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#e0e0e0',
  },
});

export default HomeScreen;
