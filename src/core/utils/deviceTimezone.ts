/**
 * Get the device's IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York').
 * Used so backend can format notification times in the user's local time.
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
