import moment from 'moment';

/**
 * Parse a UTC timestamp (ISO with Z or without) and format in the device's local time.
 * DST-safe: uses device timezone; same rule as event lists and notification body.
 * Use for any UI that displays event_time from API or notification payload.
 *
 * @param utcIso - UTC ISO string (e.g. from API or notification data.event_time)
 * @param formatStr - moment format string; default 'MMM DD, YYYY h:mm A'
 * @returns Formatted local time string, or original string on parse error
 */
export function formatUtcToLocal(
  utcIso: string,
  formatStr: string = 'MMM DD, YYYY h:mm A',
): string {
  if (!utcIso || typeof utcIso !== 'string') return '';
  try {
    return moment.utc(utcIso.trim()).local().format(formatStr);
  } catch {
    return utcIso;
  }
}

/**
 * Get a human-readable event time from FCM notification data.
 * data.event_time is sent as UTC ISO (with Z) by the backend.
 * Use when showing notification tap payload (e.g. detail screen or alert).
 *
 * @param data - FCM data payload (e.g. remoteMessage.data)
 * @returns Formatted local time or empty string if no event_time
 */
export function getFormattedEventTimeFromNotificationData(
  data?: Record<string, string | null> | null,
): string {
  const eventTime = data?.event_time;
  if (!eventTime || typeof eventTime !== 'string') return '';
  return formatUtcToLocal(eventTime);
}
