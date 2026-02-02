import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
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

const EVENTS_PAGE_SIZE = 25;
const INFINITE_SCROLL_THRESHOLD_PX = 200;

const RecentEventsScreen: React.FC = () => {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PAGE_SIZE);
  const loadMoreTriggeredRef = useRef(false);

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
        const response = await eventsApi.getEvents(targetDevice.device_id, 'last_24_hours');
        const eventList = response.data || [];
        // Sort by actual event date (rawevent.originalEvent.event_date), most recent first
        eventList.sort((a, b) => {
          const timeA = getEventDate(a);
          const timeB = getEventDate(b);
          return timeB - timeA;
        });
        setEvents(eventList);
        setVisibleCount(EVENTS_PAGE_SIZE);
        loadMoreTriggeredRef.current = false;
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

  /** Industry pattern: infinite scroll – load more when user scrolls near bottom */
  const handleScroll = useCallback(
    (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = ev.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const hasMore = visibleCount < events.length;
      if (
        hasMore &&
        distanceFromBottom < INFINITE_SCROLL_THRESHOLD_PX &&
        !loadMoreTriggeredRef.current
      ) {
        loadMoreTriggeredRef.current = true;
        setVisibleCount(prev => Math.min(prev + EVENTS_PAGE_SIZE, events.length));
      }
      if (distanceFromBottom > INFINITE_SCROLL_THRESHOLD_PX + 100) {
        loadMoreTriggeredRef.current = false;
      }
    },
    [events.length, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + EVENTS_PAGE_SIZE, events.length));
  }, [events.length]);

  /** Use actual event date from API (event_date) for display/sort; fallback to eventtime */
  const getEventDate = (item: DeviceEvent): number => {
    const eventDate = item.rawevent?.originalEvent?.event_date as string | undefined;
    if (eventDate) {
      const parsed = new Date(eventDate).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    return new Date(item.eventtime as string).getTime();
  };

  const formatEventTime = (item: DeviceEvent): string => {
    const eventDate = item.rawevent?.originalEvent?.event_date as string | undefined;
    const timeStr = (eventDate || item.eventtime) as string;
    try {
      return moment(timeStr).utc().local().format('MMM DD, YYYY h:mm A');
    } catch {
      return timeStr;
    }
  };

  /** Human-readable title: event_descr preferred over eventtype */
  const getEventTitle = (item: DeviceEvent): string => {
    const desc = item.rawevent?.originalEvent?.event_descr;
    if (desc && String(desc).trim()) return String(desc).trim();
    return item.eventtype || 'Event';
  };

  /** Category label from signal_type for display */
  const getEventCategory = (signalType: string): string => {
    const type = (signalType || '').toUpperCase();
    if (type === 'M') return 'Medical';
    if (type === 'OA') return 'Operator';
    if (type === 'SY') return 'System';
    if (type === 'TT') return 'Test';
    if (type === 'TF') return 'Test failed';
    if (type === 'ZZ') return 'Message';
    if (type === 'AA') return 'Alarm';
    if (type === 'A') return 'Location / Misc';
    return signalType || 'Event';
  };

  /** Parse battery % and signal from Test Timer additional_info */
  const parseTestTimerInfo = (
    additionalInfo: string | undefined,
  ): { battery?: number; signal?: string } => {
    const info = additionalInfo || '';
    const batteryMatch = info.match(/Battery Level:\s*(\d+)/i) || info.match(/Battery:\s*(\d+)/i);
    const signalMatch =
      info.match(/Signal Strength:\s*(\d+\/\d+)/i) || info.match(/Signal:\s*(\d+\/\d+)/i);
    return {
      battery: batteryMatch ? parseInt(batteryMatch[1], 10) : undefined,
      signal: signalMatch ? signalMatch[1] : undefined,
    };
  };

  /** Short address from Location Update additional_info (e.g. "2502 Cooper St, Piscataway, NJ") */
  const getLocationAddress = (additionalInfo: string | undefined): string | null => {
    const info = additionalInfo || '';
    const match =
      info.match(/Closest Address\s*-\s*(.+?)(?:, USA)?$/i) ||
      info.match(/Address\s*-\s*(.+?)(?:, USA)?$/i);
    return match ? match[1].trim() : null;
  };

  const getEventLucideIcon = (
    item: DeviceEvent,
  ):
    | typeof Heart
    | typeof MapPin
    | typeof ActivityIcon
    | typeof Battery
    | typeof AlertTriangle
    | typeof CheckCircle => {
    const signalType = String(item.eventtype ?? item.signal_type ?? '').toUpperCase();
    const desc = String(item.rawevent?.originalEvent?.event_descr ?? '').toLowerCase();
    if (signalType === 'M' || desc.includes('emergency') || desc.includes('personal'))
      return AlertTriangle;
    if (signalType === 'TT' || signalType === 'TF' || desc.includes('timer test')) return Battery;
    if (
      signalType === 'A' &&
      (desc.includes('location') || item.rawevent?.originalEvent?.event_id === 'LOCUP')
    )
      return MapPin;
    if (
      signalType === 'OA' ||
      signalType === 'AA' ||
      desc.includes('clear') ||
      desc.includes('stella')
    )
      return CheckCircle;
    if (desc.includes('heart')) return Heart;
    if (desc.includes('location')) return MapPin;
    if (desc.includes('activity')) return ActivityIcon;
    if (desc.includes('battery')) return Battery;
    if (desc.includes('fall') || desc.includes('alert')) return AlertTriangle;
    return CheckCircle;
  };

  const getEventTypeColor = (item: DeviceEvent): string => {
    const signalType = String(item.eventtype ?? item.signal_type ?? '').toUpperCase();
    const desc = String(item.rawevent?.originalEvent?.event_descr ?? '').toLowerCase();
    if (signalType === 'M' || desc.includes('emergency')) return colors.error;
    if (signalType === 'TF' || desc.includes('not received')) return colors.warning;
    if (signalType === 'TT') return colors.primary;
    if (signalType === 'A' && desc.includes('location')) return colors.blue;
    if (signalType === 'OA' || desc.includes('clear') || desc.includes('stella'))
      return colors.success;
    return colors.text;
  };

  const getEventStatus = (item: DeviceEvent): 'warning' | 'success' | 'normal' => {
    const signalType = String(item.eventtype ?? item.signal_type ?? '').toUpperCase();
    const desc = String(item.rawevent?.originalEvent?.event_descr ?? '').toLowerCase();
    if (
      signalType === 'M' ||
      signalType === 'TF' ||
      desc.includes('emergency') ||
      desc.includes('not received')
    )
      return 'warning';
    if (
      signalType === 'OA' ||
      signalType === 'TT' ||
      desc.includes('clear') ||
      desc.includes('no help')
    )
      return 'success';
    return 'normal';
  };

  const groupEventsByDate = (eventsList: DeviceEvent[]): Record<string, DeviceEvent[]> => {
    const grouped: Record<string, DeviceEvent[]> = {};
    eventsList.forEach(event => {
      try {
        const ts = getEventDate(event);
        const date = moment(ts);
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
        if (!grouped.Unknown) {
          grouped.Unknown = [];
        }
        grouped.Unknown.push(event);
      }
    });
    return grouped;
  };

  const renderEventItem = (item: DeviceEvent) => {
    const title = getEventTitle(item);
    const category = getEventCategory(String(item.eventtype ?? item.signal_type ?? ''));
    const iconColor = getEventTypeColor(item);
    const status = getEventStatus(item);
    const EventIcon = getEventLucideIcon(item);
    const original = item.rawevent?.originalEvent as Record<string, unknown> | undefined;
    const additionalInfo = (original?.additional_info as string) || '';
    const eventId = (original?.event_id as string) || '';
    const isLocationUpdate = eventId === 'LOCUP' || title.toLowerCase().includes('location update');
    const locationAddress = getLocationAddress(additionalInfo);
    const { battery, signal } = parseTestTimerInfo(additionalInfo);
    const location = item.rawevent?.location;
    const battFromOriginal = original?.batt as number | undefined;

    return (
      <Card style={styles.eventCard} padding={spacing.md}>
        <View style={styles.eventContent}>
          <View
            style={[
              styles.eventIconContainer,
              {
                backgroundColor:
                  status === 'warning'
                    ? colors.errorBackground
                    : status === 'success'
                    ? colors.primary + '22'
                    : colors.lightGray,
              },
            ]}>
            <EventIcon size={22} color={iconColor} />
          </View>
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              <AppText variant="bodyBold" style={styles.eventTitle} numberOfLines={2}>
                {title}
              </AppText>
              <View
                style={[
                  styles.eventStatusBadge,
                  {
                    backgroundColor:
                      status === 'warning'
                        ? colors.errorBackground
                        : status === 'success'
                        ? colors.primary + '22'
                        : colors.lightGray,
                  },
                ]}>
                <AppText
                  variant="small"
                  numberOfLines={1}
                  style={[
                    styles.eventStatusBadgeText,
                    {
                      color:
                        status === 'warning'
                          ? colors.error
                          : status === 'success'
                          ? colors.primary
                          : colors.text,
                    },
                  ]}>
                  {category}
                </AppText>
              </View>
            </View>
            {!!additionalInfo &&
              !isLocationUpdate &&
              !(item.eventtype === 'Test Timer' || item.eventtype === 'TT') && (
                <AppText
                  variant="small"
                  color={colors.textSecondary}
                  style={styles.eventDescription}
                  numberOfLines={2}>
                  {additionalInfo}
                </AppText>
              )}
            {isLocationUpdate && (locationAddress || location) && (
              <AppText
                variant="small"
                color={colors.textSecondary}
                style={styles.eventDescription}
                numberOfLines={2}>
                {locationAddress ||
                  (location && `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)}
              </AppText>
            )}
            {(battery !== undefined || battFromOriginal !== undefined) && (
              <AppText variant="small" color={colors.textSecondary} style={styles.eventDescription}>
                Battery: {battery ?? battFromOriginal}%{signal != null ? ` · Signal ${signal}` : ''}
              </AppText>
            )}
            <View style={styles.eventTimeContainer}>
              <Clock size={12} color={colors.textSecondary} />
              <AppText variant="small" color={colors.textSecondary} style={styles.eventTime}>
                {formatEventTime(item)}
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
        <View style={styles.navbarWrapper}>
          <TopNavbar
            title="Events Timeline"
            subtitle="Track all device activities"
            variant="figma"
          />
        </View>
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
      <View style={styles.navbarWrapper}>
        <TopNavbar title="Events Timeline" subtitle="Track all device activities" variant="figma" />
      </View>

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
            No events recorded in the last 24 hours
          </AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={160}
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

          {/* Pagination: show first visibleCount events, grouped by date */}
          {(() => {
            const visibleEvents = events.slice(0, visibleCount);
            const hasMore = visibleCount < events.length;
            const totalCount = events.length;
            return (
              <>
                {visibleEvents.length > 0 ? (
                  Object.entries(groupEventsByDate(visibleEvents)).map(([date, dateEvents]) => (
                    <View key={date} style={styles.dateGroup}>
                      <View style={styles.dateHeader}>
                        <View style={styles.dateHeaderPill}>
                          <Clock size={14} color={colors.primary} />
                          <AppText variant="small" style={styles.dateLabel}>
                            {date}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.eventsList}>
                        {dateEvents.map((event, index) => (
                          <View
                            key={`${
                              event.rawevent?.originalEvent?.seqno ?? event.eventtime
                            }-${index}`}>
                            {renderEventItem(event)}
                          </View>
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
                {visibleEvents.length > 0 && (
                  <View style={styles.paginationFooter}>
                    <View style={styles.paginationBar}>
                      <AppText
                        variant="small"
                        color={colors.textSecondary}
                        style={styles.paginationCount}>
                        {visibleCount} of {totalCount} events
                      </AppText>
                      {hasMore ? (
                        <TouchableOpacity
                          style={styles.loadMoreButton}
                          onPress={loadMore}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="Load more events">
                          <AppText variant="small" style={styles.loadMoreButtonText}>
                            Load more
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.paginationComplete}>
                          <CheckCircle size={16} color={colors.success} />
                          <AppText
                            variant="small"
                            color={colors.textSecondary}
                            style={styles.paginationCompleteText}>
                            All loaded
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </>
            );
          })()}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  paginationFooter: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lightGray + '40',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  paginationCount: {
    fontWeight: '600',
    color: colors.text,
  },
  loadMoreButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  loadMoreButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  paginationComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paginationCompleteText: {
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: spacing.xl,
  },
  dateHeader: {
    marginBottom: spacing.sm,
  },
  dateHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primary + '12',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  dateLabel: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  eventsList: {
    gap: spacing.md,
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
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  eventContent: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
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
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventTitle: {
    flex: 1,
    marginRight: spacing.xs,
  },
  eventStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.xl,
    flexShrink: 0,
    maxWidth: 120,
  },
  eventStatusBadgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  eventDescription: {
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl, // py-12 in Figma
    paddingHorizontal: spacing.md,
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
