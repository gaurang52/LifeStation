import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, TopNavbar, Button, AppText } from '@shared/components';
import { colors, spacing, borderRadius } from '@shared/theme';
import { deviceApi, type DeviceListItem } from '@core/api/deviceApi';
import { eventsApi, type EventFrequency } from '@core/api/eventsApi';
import { mapApi } from '@core/api/mapApi';
import { ErrorHandler } from '@core/utils/errorHandler';

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

const FREQUENCY_OPTIONS: { label: string; value: EventFrequency }[] = [
  { label: 'Last 24 Hours', value: 'last_24_hours' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'All', value: 'all' },
];

const MapScreen: React.FC = () => {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [activeDevice, setActiveDevice] = useState<DeviceListItem | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [loading, setLoading] = useState(true); // Start loading – show loader before map
  const [frequency, setFrequency] = useState<EventFrequency>('last_24_hours');
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  // Geofence center and radius - initialized from API or device location (not hardcoded)
  const [geofenceCenter, setGeofenceCenter] = useState<Coordinate | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState<number | null>(null);
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [loadingGeofence, setLoadingGeofence] = useState(false);

  const mapRef = useRef<MapView>(null);
  const geofenceMapRef = useRef<MapView>(null);

  // Prevent duplicate API calls
  const fetchingDevicesRef = useRef(false);
  const fetchingLocationRef = useRef(false);
  const fetchingGeofenceRef = useRef(false);
  const rateLimitRetryTimeoutRef = useRef<number | null>(null);

  // Get default location from coordinates (DeviceListItem has no location - we get it from getDeviceRecent)
  const getDefaultLocation = (): Coordinate => {
    // Try to use most recent coordinate
    if (coordinates.length > 0) {
      return coordinates[coordinates.length - 1];
    }
    // Last resort: use geofence center if available
    if (geofenceCenter) {
      return geofenceCenter;
    }
    // Only use world center as absolute last resort (not a specific city)
    return {
      latitude: 0,
      longitude: 0,
    };
  };

  // Fetch devices on mount
  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      if (fetchingDevicesRef.current) return;

      try {
        fetchingDevicesRef.current = true;
        setLoading(true);
        const response = await deviceApi.getDevicesList();
        const deviceList = response.devices || [];
        if (isMounted) {
          setDevices(deviceList);
          if (deviceList.length > 0) {
            setActiveDevice(deviceList[0]);
          } else {
            setLoading(false); // No devices – stop loading, show empty state
          }
        }
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        if (isMounted) setLoading(false);
        if (error.statusCode === 429) {
          console.warn('Rate limit exceeded while fetching devices. Please wait a moment.');
        } else {
          console.error('Error fetching devices:', err);
        }
      } finally {
        fetchingDevicesRef.current = false;
      }
    };

    fetchDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch geofence settings when active device changes (debounced)
  useEffect(() => {
    if (!activeDevice?.device_id) return;

    // Clear any pending timeout
    if (rateLimitRetryTimeoutRef.current) {
      clearTimeout(rateLimitRetryTimeoutRef.current);
      rateLimitRetryTimeoutRef.current = null;
    }

    // Debounce geofence fetch
    const timeoutId = setTimeout(() => {
      fetchGeofenceSettings();
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced on purpose, fetchGeofenceSettings is stable
  }, [activeDevice?.device_id]);

  // Fetch location events when device or frequency changes (debounced)
  useEffect(() => {
    if (!activeDevice?.device_id) return;

    // Clear any pending timeout
    if (rateLimitRetryTimeoutRef.current) {
      clearTimeout(rateLimitRetryTimeoutRef.current);
      rateLimitRetryTimeoutRef.current = null;
    }

    // Brief debounce to batch rapid filter changes
    const timeoutId = setTimeout(() => {
      fetchLocationEvents();
    }, 150);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced on purpose, fetchLocationEvents is stable
  }, [activeDevice?.device_id, frequency]);

  // Center map on most recent location when coordinates update
  useEffect(() => {
    if (coordinates.length > 0 && mapRef.current) {
      const mostRecent = coordinates[coordinates.length - 1];
      mapRef.current.animateToRegion(
        {
          latitude: mostRecent.latitude,
          longitude: mostRecent.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000,
      );
    }
  }, [coordinates]);

  const fetchGeofenceSettings = async () => {
    if (!activeDevice?.device_id || fetchingGeofenceRef.current) return;

    try {
      fetchingGeofenceRef.current = true;
      setLoadingGeofence(true);
      const response = await mapApi.getGeofence(activeDevice.device_id);
      if (response.data?.geo_fence_settings) {
        const settings = response.data.geo_fence_settings;
        setGeofenceCenter({
          latitude: settings.center.lat,
          longitude: settings.center.lng,
        });
        setGeofenceRadius(settings.radius || 1000);
      }
    } catch (err: unknown) {
      // Geofence not set yet - this is normal and expected
      // Silently handle 404/400 errors (geofence not configured)
      const error = err as { statusCode?: number; message?: string; originalError?: unknown };
      const statusCode = error.statusCode;

      // Handle rate limit errors
      if (statusCode === 429) {
        console.warn('Rate limit exceeded while fetching geofence. Will retry later.');
        // Don't retry immediately - let the user wait
        return;
      }

      // Only log if it's not a "not found" error (404 or 400)
      if (statusCode !== 404 && statusCode !== 400) {
        // Other error - log it for debugging
        console.warn('Error fetching geofence settings:', error.message || err);
      }
      // For 404/400, silently use defaults (no geofence configured yet)
    } finally {
      fetchingGeofenceRef.current = false;
      setLoadingGeofence(false);
    }
  };

  // Infer id_type when missing (e.g. IMEI = 15 digits)
  const getIdType = (device: DeviceListItem): string => {
    if (device.id_type) return device.id_type;
    const did = String(device.device_id || '').trim();
    if (/^\d{15}$/.test(did)) return 'imei';
    return 'imei'; // default for device_id
  };

  const fetchLocationEvents = async () => {
    if (!activeDevice?.device_id || fetchingLocationRef.current) return;

    const idType = getIdType(activeDevice);
    try {
      fetchingLocationRef.current = true;
      setLoading(true);
      const locationCoords: Coordinate[] = [];

      // 1. Fetch device recent location (most current) - primary source for "current location"
      try {
        const recentResponse = await deviceApi.getDeviceRecent(
          idType as import('@core/api/deviceApi').DeviceIdType,
          activeDevice.device_id,
        );
        const deviceData = recentResponse?.device ?? recentResponse;

        if (deviceData?.location?.latitude != null && deviceData?.location?.longitude != null) {
          const lat =
            typeof deviceData.location.latitude === 'string'
              ? parseFloat(deviceData.location.latitude)
              : deviceData.location.latitude;
          const lng =
            typeof deviceData.location.longitude === 'string'
              ? parseFloat(deviceData.location.longitude)
              : deviceData.location.longitude;
          if (!isNaN(lat) && !isNaN(lng)) {
            locationCoords.push({
              latitude: lat,
              longitude: lng,
              timestamp: deviceData.location.timestamp || deviceData.last_seen || undefined,
            });
          }
        }
      } catch (err) {
        const error = err as { statusCode?: number; message?: string };
        // Handle rate limit - don't retry immediately
        if (error.statusCode === 429) {
          console.warn('Rate limit exceeded while fetching device recent location.');
          // Skip this call, continue with events API
        } else {
          console.warn('Error fetching device recent location:', err);
        }
      }

      // 2. Fetch location events from events API
      try {
        const response = await eventsApi.getEventsByType(
          activeDevice.device_id,
          frequency,
          'Periodic Location',
        );

        const eventList = response.data || [];

        eventList.forEach(event => {
          if (event.rawevent?.location) {
            const lat = event.rawevent.location.latitude;
            const lng = event.rawevent.location.longitude;
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
              locationCoords.push({
                latitude: typeof lat === 'string' ? parseFloat(lat) : lat,
                longitude: typeof lng === 'string' ? parseFloat(lng) : lng,
                timestamp: event.eventtime || undefined,
              });
            }
          }
        });
      } catch (err) {
        const error = err as { statusCode?: number; message?: string };
        // Handle rate limit errors
        if (error.statusCode === 429) {
          console.warn('Rate limit exceeded while fetching location events. Please wait a moment.');
          // Don't clear coordinates - keep existing data
          return;
        } else {
          console.warn('Error fetching location events:', err);
        }
      }

      // 3. Sort by timestamp (most recent first, then oldest)
      locationCoords.sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // 4. Reverse to show oldest to newest for polyline (chronological path)
      const sortedCoords = [...locationCoords].reverse();

      setCoordinates(sortedCoords);
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      // Handle rate limit errors gracefully
      if (error.statusCode === 429) {
        console.warn('Rate limit exceeded. Please wait a moment before trying again.');
        // Keep existing coordinates
        return;
      }

      const errorMessage = ErrorHandler.getErrorMessage(err) || 'Failed to load location data.';
      console.error('Error fetching location data:', errorMessage);
      setCoordinates([]);
    } finally {
      fetchingLocationRef.current = false;
      setLoading(false);
    }
  };

  const handleSaveGeofence = async () => {
    if (!activeDevice?.device_id) {
      Alert.alert('Error', 'No device selected');
      return;
    }

    if (!geofenceCenter || geofenceRadius === null) {
      Alert.alert('Error', 'Please set geofence center and radius');
      return;
    }

    try {
      setSavingGeofence(true);
      await mapApi.saveGeofence(
        activeDevice.device_id,
        geofenceCenter.latitude,
        geofenceCenter.longitude,
        geofenceRadius,
      );
      Alert.alert('Success', 'Geofence settings saved successfully');
      setShowGeofenceModal(false);
    } catch (err: unknown) {
      const errorMessage = ErrorHandler.getErrorMessage(err) || 'Failed to save geofence settings.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingGeofence(false);
    }
  };

  const handleMapPress = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    const { coordinate } = event.nativeEvent;
    setGeofenceCenter({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  const handleMarkerDragEnd = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    const { coordinate } = event.nativeEvent;
    setGeofenceCenter({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  // Calculate map region based on coordinates or devices
  const getMapRegion = (): Coordinate & { latitudeDelta: number; longitudeDelta: number } => {
    if (coordinates.length > 0) {
      // Use most recent location (last in chronologically sorted array)
      const mostRecentCoord = coordinates[coordinates.length - 1];
      return {
        latitude: mostRecentCoord.latitude,
        longitude: mostRecentCoord.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // DeviceListItem has no location - use default (coordinates, geofence, or world center)
    const defaultLoc = getDefaultLocation();
    return {
      ...defaultLoc,
      latitudeDelta: defaultLoc.latitude === 0 && defaultLoc.longitude === 0 ? 180 : 0.05,
      longitudeDelta: defaultLoc.latitude === 0 && defaultLoc.longitude === 0 ? 360 : 0.05,
    };
  };

  const mapRegion = getMapRegion();
  const currentFrequencyLabel =
    FREQUENCY_OPTIONS.find(opt => opt.value === frequency)?.label || 'Last 24 Hours';

  // Show full-screen loader first – correct UX: loader then map with data (never map then loader)
  if (loading) {
    return (
      <Screen padded={false} edges={['top']} style={styles.screen}>
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Maps/GPS Location"
            subtitle="Location tracking and geofencing"
            variant="figma"
          />
        </View>
        <View style={styles.loadingFullScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading location data…
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']} style={styles.screen}>
      <View style={styles.navbarWrapper}>
        <TopNavbar
          title="Maps/GPS Location"
          subtitle="Location tracking and geofencing"
          variant="figma"
        />
      </View>
      <View style={styles.content}>
        {/* Device & Time Range Selectors */}
        <View style={styles.frequencyContainer}>
          {devices.length > 1 && (
            <View style={styles.selectorRow}>
              <AppText variant="small" color={colors.textSecondary} style={styles.selectorLabel}>
                Device
              </AppText>
              <TouchableOpacity
                style={styles.frequencyButton}
                onPress={() => {
                  setShowDeviceDropdown(!showDeviceDropdown);
                  setShowFrequencyDropdown(false);
                }}>
                <AppText variant="body" color={colors.text} numberOfLines={1}>
                  {activeDevice?.name || activeDevice?.device_id || 'Select device'}
                </AppText>
                <MaterialIcons
                  name={showDeviceDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              {showDeviceDropdown && (
                <View style={styles.dropdown}>
                  {devices.map(device => (
                    <TouchableOpacity
                      key={`${device.device_id}-${device.id_type}`}
                      style={[
                        styles.dropdownItem,
                        activeDevice?.device_id === device.device_id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setActiveDevice(device);
                        setShowDeviceDropdown(false);
                      }}>
                      <AppText
                        variant="body"
                        color={
                          activeDevice?.device_id === device.device_id
                            ? colors.primary
                            : colors.text
                        }
                        numberOfLines={1}>
                        {device.name || device.device_id}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          <View style={[styles.selectorRow, devices.length <= 1 && styles.selectorRowSingle]}>
            <AppText variant="small" color={colors.textSecondary} style={styles.selectorLabel}>
              Time range
            </AppText>
            <TouchableOpacity
              style={styles.frequencyButton}
              onPress={() => {
                setShowFrequencyDropdown(!showFrequencyDropdown);
                setShowDeviceDropdown(false);
              }}>
              <AppText variant="body" color={colors.text}>
                {currentFrequencyLabel}
              </AppText>
              <MaterialIcons
                name={showFrequencyDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            {showFrequencyDropdown && (
              <View style={styles.dropdown}>
                {FREQUENCY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      frequency === option.value && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setFrequency(option.value);
                      setShowFrequencyDropdown(false);
                    }}>
                    <AppText
                      variant="body"
                      color={frequency === option.value ? colors.primary : colors.text}>
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Map Container - map only shown when !loading (no overlay, we use full-screen loader) */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
            loadingEnabled={true}
            loadingIndicatorColor={colors.primary}
            mapType="standard"
            showsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            onMapReady={() => {
              // Center on most recent location when map is ready
              if (coordinates.length > 0 && mapRef.current) {
                const mostRecent = coordinates[coordinates.length - 1];
                mapRef.current.animateToRegion(
                  {
                    latitude: mostRecent.latitude,
                    longitude: mostRecent.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  },
                  1000,
                );
              }
            }}>
            {/* Location Polyline */}
            {coordinates.length > 0 && (
              <Polyline coordinates={coordinates} strokeWidth={2} strokeColor={colors.primary} />
            )}

            {/* Location Markers - Show most recent location */}
            {coordinates.length > 0 && (
              <Marker
                coordinate={coordinates[coordinates.length - 1]} // Most recent (last in sorted array)
                title="Current Location"
                description={
                  coordinates[coordinates.length - 1].timestamp
                    ? `Last updated: ${new Date(
                        coordinates[coordinates.length - 1].timestamp!,
                      ).toLocaleString()}`
                    : undefined
                }
                pinColor={colors.primary}
              />
            )}

            {/* Markers come from coordinates (getDeviceRecent + getEventsByType); DeviceListItem has no location */}
          </MapView>

          {coordinates.length === 0 && !loading && (
            <View style={styles.emptyStateOverlay}>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyStateText}>
                {devices.length === 0
                  ? 'No devices found. Add a device to see location.'
                  : 'No location data for selected time range. Try "All" or ensure the device has sent location updates.'}
              </AppText>
            </View>
          )}
        </View>

        {/* Set Geofence Button */}
        <View style={styles.bottomButtonContainer}>
          <Button
            label="Set Geofence"
            onPress={() => {
              // Initialize geofence center from device location or coordinates when opening modal
              if (!geofenceCenter) {
                const initialCenter = getDefaultLocation();
                setGeofenceCenter(initialCenter);
              }
              if (geofenceRadius === null) {
                setGeofenceRadius(1000); // Default radius when first opening
              }
              setShowGeofenceModal(true);
            }}
            loading={loadingGeofence}
          />
        </View>
      </View>

      {/* Geofence Modal */}
      <Modal
        visible={showGeofenceModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowGeofenceModal(false)}>
        <Screen padded={false} style={styles.modalContainer}>
          <View style={styles.navbarWrapper}>
            <TopNavbar
              title="Set Geofence"
              subtitle="Configure geofence center and radius"
              variant="figma"
              showBackButton
              onBackPress={() => setShowGeofenceModal(false)}
            />
          </View>

          <View style={styles.modalMapContainer}>
            <MapView
              ref={geofenceMapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.modalMap}
              region={{
                latitude: geofenceCenter?.latitude || getDefaultLocation().latitude,
                longitude: geofenceCenter?.longitude || getDefaultLocation().longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              zoomEnabled={true}
              scrollEnabled={true}
              rotateEnabled={true}
              pitchEnabled={true}
              onPress={handleMapPress}>
              {geofenceCenter && (
                <>
                  <Marker
                    coordinate={geofenceCenter}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                    title="Geofence Center"
                  />
                  {geofenceRadius !== null && geofenceRadius > 0 && (
                    <Circle
                      center={geofenceCenter}
                      radius={geofenceRadius}
                      strokeWidth={2}
                      strokeColor={colors.primary}
                      fillColor="rgba(0, 122, 255, 0.2)"
                    />
                  )}
                </>
              )}
            </MapView>
          </View>

          <View style={styles.modalControls}>
            <View style={styles.sliderContainer}>
              <AppText variant="body" color={colors.text} style={styles.sliderLabel}>
                Radius: {Math.round(geofenceRadius ?? 1000)} meters
              </AppText>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  value={geofenceRadius ?? 1000}
                  step={1}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.lightGray}
                  thumbTintColor={colors.primary}
                  onValueChange={value => setGeofenceRadius(Math.round(value))}
                />
                <View style={styles.sliderLabels}>
                  <AppText variant="small" color={colors.textSecondary}>
                    0m
                  </AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    10km
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  !geofenceCenter &&
                    (geofenceRadius === null || geofenceRadius === 0) &&
                    styles.clearButtonDisabled,
                ]}
                onPress={() => {
                  setGeofenceRadius(0);
                  setGeofenceCenter(null);
                }}
                disabled={!geofenceCenter && (geofenceRadius === null || geofenceRadius === 0)}
                activeOpacity={0.8}>
                <MaterialIcons
                  name="clear"
                  size={20}
                  color={
                    !geofenceCenter && (geofenceRadius === null || geofenceRadius === 0)
                      ? colors.textSecondary
                      : colors.error
                  }
                />
                <AppText
                  variant="bodyBold"
                  color={
                    !geofenceCenter && (geofenceRadius === null || geofenceRadius === 0)
                      ? colors.textSecondary
                      : colors.error
                  }>
                  Clear
                </AppText>
              </TouchableOpacity>
              <Button
                label="Save"
                onPress={handleSaveGeofence}
                loading={savingGeofence}
                disabled={!geofenceCenter || geofenceRadius === null || geofenceRadius === 0}
              />
            </View>
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  navbarWrapper: {
    paddingTop: spacing.sm,
  },
  content: {
    flex: 1,
  },
  frequencyContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 1000,
    gap: spacing.sm,
  },
  selectorRow: {
    position: 'relative',
  },
  selectorRowSingle: {
    marginTop: 0,
  },
  selectorLabel: {
    marginBottom: spacing.xs,
  },
  frequencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.lightPrimary,
  },
  loadingFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayWhite90,
  },
  emptyStateText: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalMapContainer: {
    flex: 1,
  },
  modalMap: {
    width: '100%',
    height: '100%',
  },
  modalControls: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  sliderLabel: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sliderWrapper: {
    width: '100%',
    marginVertical: spacing.md,
  },
  slider: {
    width: '100%',
    height: 60,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  clearButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.lightGray,
  },
});

export default MapScreen;
