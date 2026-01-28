import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Battery,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
} from 'lucide-react-native';
import { Screen, AppText, Card, TopNavbar } from '@shared/components';
import { spacing, colors, borderRadius } from '@shared/theme';
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

  const getEventLucideIcon = (
    eventType: string,
  ):
    | typeof Heart
    | typeof MapPin
    | typeof ActivityIcon
    | typeof Battery
    | typeof AlertTriangle
    | typeof CheckCircle => {
    const type = eventType?.toLowerCase() || '';
    if (type.includes('heart')) return Heart;
    if (type.includes('location')) return MapPin;
    if (type.includes('activity')) return ActivityIcon;
    if (type.includes('battery')) return Battery;
    if (type.includes('fall') || type.includes('alert')) return AlertTriangle;
    return CheckCircle;
  };

  const getEventTypeColor = (eventType: string): string => {
    const type = eventType?.toLowerCase() || '';
    if (type.includes('heart')) return colors.primary;
    if (type.includes('location')) return colors.blue;
    if (type.includes('activity')) return colors.success;
    if (type.includes('battery')) return colors.warning;
    if (type.includes('fall')) return colors.error;
    return colors.success;
  };

  const getEventStatus = (eventType: string): 'warning' | 'success' | 'normal' => {
    const type = eventType?.toLowerCase() || '';
    if (type.includes('battery') || type.includes('fall') || type.includes('alert'))
      return 'warning';
    if (type.includes('activity') || type.includes('goal')) return 'success';
    return 'normal';
  };

  const groupEventsByDate = (eventsList: DeviceEvent[]): Record<string, DeviceEvent[]> => {
    const grouped: Record<string, DeviceEvent[]> = {};
    eventsList.forEach(event => {
      try {
        const date = moment(event.eventtime).utc().local();
        const displayDate = date.isSame(moment(), 'day')
          ? 'Today'
          : date.isSame(moment().subtract(1, 'day'), 'day')
          ? 'Yesterday'
          : date.format('MMM DD, YYYY');

        if (!grouped[displayDate]) {
          grouped[displayDate] = [];
        }
        grouped[displayDate].push(event);
      } catch {
        // If date parsing fails, use "Unknown"
        if (!grouped.Unknown) {
          grouped.Unknown = [];
        }
        grouped.Unknown.push(event);
      }
    });
    return grouped;
  };

  const renderEventItem = (item: DeviceEvent) => {
    const eventType = item.eventtype || 'Unknown Event';
    const iconColor = getEventTypeColor(eventType);
    const status = getEventStatus(eventType);
    const location = item.rawevent?.location;
    const EventIcon = getEventLucideIcon(eventType);

    return (
      <Card style={styles.eventCard}>
        <View style={styles.eventContent}>
          <View
            style={[
              styles.eventIconContainer,
              {
                backgroundColor:
                  status === 'warning'
                    ? colors.warning + '20'
                    : status === 'success'
                    ? colors.success + '20'
                    : colors.blue + '20',
              },
            ]}>
            <EventIcon size={24} color={iconColor} />
          </View>
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              <AppText variant="bodyBold" style={styles.eventTitle}>
                {eventType}
              </AppText>
              <View
                style={[
                  styles.eventStatusBadge,
                  {
                    backgroundColor:
                      status === 'warning'
                        ? colors.warning + '20'
                        : status === 'success'
                        ? colors.success + '20'
                        : colors.blue + '20',
                  },
                ]}>
                <AppText
                  variant="small"
                  style={{
                    color:
                      status === 'warning'
                        ? colors.warning
                        : status === 'success'
                        ? colors.success
                        : colors.blue,
                  }}>
                  {status}
                </AppText>
              </View>
            </View>
            {!!location && (
              <AppText variant="small" color={colors.textSecondary} style={styles.eventDescription}>
                Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </AppText>
            )}
            {item.rawevent?.originalEvent?.batt !== undefined && (
              <AppText variant="small" color={colors.textSecondary} style={styles.eventDescription}>
                Battery: {item.rawevent.originalEvent.batt}%
              </AppText>
            )}
            <View style={styles.eventTimeContainer}>
              <Clock size={12} color={colors.textSecondary} />
              <AppText variant="small" color={colors.textSecondary} style={styles.eventTime}>
                {formatEventTime(item.eventtime)}
              </AppText>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading && events.length === 0) {
    return (
      <Screen padded={false}>
        <TopNavbar title="Events Timeline" subtitle="Track all device activities" variant="figma" />
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
      <TopNavbar title="Events Timeline" subtitle="Track all device activities" variant="figma" />

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

          {/* Filter Chips */}
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}>
              <TouchableOpacity style={styles.filterChipActive}>
                <AppText variant="small" style={styles.filterChipTextActive}>
                  All Events
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <AppText variant="small" style={styles.filterChipText}>
                  Health
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <AppText variant="small" style={styles.filterChipText}>
                  Location
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <AppText variant="small" style={styles.filterChipText}>
                  Alerts
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Grouped Events by Date */}
          {events.length > 0 ? (
            Object.entries(groupEventsByDate(events)).map(([date, dateEvents]) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateHeaderLeft}>
                    <Clock size={16} color={colors.textSecondary} />
                    <AppText variant="small" color={colors.textSecondary} style={styles.dateLabel}>
                      {date.toUpperCase()}
                    </AppText>
                  </View>
                  <View style={styles.dateDivider} />
                </View>
                <View style={styles.eventsList}>
                  {dateEvents.map((event, index) => (
                    <View key={`${event.eventtime}-${index}`}>{renderEventItem(event)}</View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="event-busy" size={64} color={colors.icon} />
              <AppText variant="h3" style={styles.emptyTitle}>
                No Events Yet
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.emptyText}>
                Events and activities will appear here as they occur
              </AppText>
            </View>
          )}
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
    padding: spacing.lg, // px-6 in Figma
    paddingBottom: spacing.lg,
  },
  filterContainer: {
    marginBottom: spacing.md, // py-4 equivalent
  },
  filterChips: {
    flexDirection: 'row',
    gap: spacing.sm, // space-x-2 in Figma
  },
  filterChip: {
    paddingHorizontal: spacing.md, // px-4 in Figma
    paddingVertical: spacing.sm, // py-2 in Figma
    borderRadius: borderRadius.xl, // rounded-full in Figma
    backgroundColor: colors.lightGray, // bg-[#F5F5F5] in Figma
  },
  filterChipActive: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary, // bg-[#C2185B] in Figma
  },
  filterChipText: {
    color: colors.text,
    fontWeight: '500', // font-medium
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '500',
  },
  dateGroup: {
    marginBottom: spacing.lg, // mb-6 in Figma
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md, // mb-4 in Figma
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // space-x-2 in Figma
  },
  dateLabel: {
    fontWeight: '600', // font-semibold
    letterSpacing: 0.5, // tracking-wide
  },
  dateDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightGray, // bg-[#F5F5F5] in Figma
    marginLeft: spacing.sm, // ml-3 in Figma
  },
  eventsList: {
    gap: spacing.sm, // space-y-3 in Figma
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
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.lightGray, // border-[#F5F5F5] in Figma
  },
  eventContent: {
    flexDirection: 'row',
    gap: spacing.sm, // space-x-3 in Figma
  },
  eventIconContainer: {
    width: 48, // w-12 in Figma
    height: 48,
    borderRadius: borderRadius.lg, // rounded-xl in Figma
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs / 2, // mb-1 in Figma
  },
  eventTitle: {
    flex: 1,
  },
  eventStatusBadge: {
    paddingHorizontal: spacing.xs, // px-2 in Figma
    paddingVertical: spacing.xs / 2, // py-1 in Figma
    borderRadius: borderRadius.xl, // rounded-full in Figma
  },
  eventDescription: {
    marginBottom: spacing.xs / 2, // mb-2 in Figma
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2, // space-x-1 in Figma
  },
  eventTime: {
    fontSize: 12, // text-xs in Figma
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl, // py-12 in Figma
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.md, // mb-2 equivalent
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.md,
  },
});

export default RecentEventsScreen;
