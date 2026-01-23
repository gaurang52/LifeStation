import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Card, TopNavbar } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { eventsApi, type DeviceEvent } from '@core/api/eventsApi';
import { deviceApi, type Device } from '@core/api/deviceApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import moment from 'moment';

const RecentEventsScreen: React.FC = () => {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = useCallback(async () => {
    try {
      const response = await deviceApi.getDevices(1, 1);
      const deviceList = response.devices || [];
      if (deviceList.length > 0) {
        setDevice(deviceList[0]);
        return deviceList[0];
      }
      return null;
    } catch (err) {
      console.error('Error fetching device:', err);
      return null;
    }
  }, []);

  const fetchEvents = useCallback(
    async (deviceToUse?: Device | null) => {
      const targetDevice = deviceToUse || device;
      if (!targetDevice || !targetDevice.device_id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        const response = await eventsApi.getEvents(targetDevice.device_id, 'last_7_days');
        const eventList = response.data || [];
        // Sort by event time, most recent first
        eventList.sort((a, b) => {
          const timeA = new Date(a.eventtime).getTime();
          const timeB = new Date(b.eventtime).getTime();
          return timeB - timeA;
        });
        setEvents(eventList);
      } catch (err: unknown) {
        const errorMessage =
          ErrorHandler.getErrorMessage(err) || 'Failed to load events. Please try again.';
        setError(errorMessage);
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [device],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedDevice = await fetchDevice();
      if (fetchedDevice) {
        await fetchEvents(fetchedDevice);
      } else {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const fetchedDevice = await fetchDevice();
    if (fetchedDevice) {
      await fetchEvents(fetchedDevice);
    } else {
      setRefreshing(false);
    }
  }, [fetchDevice, fetchEvents]);

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

  const renderEventItem = ({ item }: { item: DeviceEvent }) => {
    const eventType = item.eventtype || 'Unknown Event';
    const iconName = getEventIcon(eventType);
    const hasLocation = item.rawevent?.location;

    return (
      <Card style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventHeaderLeft}>
            <MaterialIcons name={iconName} size={24} color={colors.primary} />
            <View style={styles.eventInfo}>
              <AppText variant="bodyBold" style={styles.eventTitle}>
                {eventType}
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.eventDate}>
                {formatEventTime(item.eventtime)}
              </AppText>
            </View>
          </View>
        </View>

        {hasLocation && (
          <View style={styles.eventDetail}>
            <MaterialIcons name="place" size={16} color={colors.textSecondary} />
            <AppText variant="small" color={colors.textSecondary} style={styles.eventDetailText}>
              {item.rawevent.location.latitude.toFixed(6)},{' '}
              {item.rawevent.location.longitude.toFixed(6)}
            </AppText>
          </View>
        )}

        {item.rawevent?.originalEvent?.batt !== undefined && (
          <View style={styles.eventDetail}>
            <MaterialIcons name="battery-full" size={16} color={colors.textSecondary} />
            <AppText variant="small" color={colors.textSecondary} style={styles.eventDetailText}>
              Battery: {item.rawevent.originalEvent.batt}%
            </AppText>
          </View>
        )}
      </Card>
    );
  };

  if (loading && events.length === 0) {
    return (
      <Screen padded={false}>
        <TopNavbar title="Recent Events" icon="event" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading events...
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TopNavbar title="Recent Events" icon="event" />

      {error && events.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Events
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : !device ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="devices-other" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.emptyTitle}>
            No Device Found
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            Add a device to view events
          </AppText>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="event-busy" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.emptyTitle}>
            No Events Found
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            No events recorded in the last 7 days
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
          {error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="info-outline" size={20} color={colors.warning} />
              <AppText variant="small" color={colors.warning} style={styles.errorBannerText}>
                {error}
              </AppText>
            </View>
          )}
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item, index) => `event-${index}-${item.eventtime}`}
            scrollEnabled={false}
          />
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
  loadingText: {
    marginTop: spacing.md,
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
  eventCard: {
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  eventTitle: {
    marginBottom: spacing.xs / 2,
  },
  eventDate: {
    fontSize: 11,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  eventDetailText: {
    flex: 1,
  },
});

export default RecentEventsScreen;
