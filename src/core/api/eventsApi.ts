import { apiClient } from './client';

export type EventFrequency = 'last_24_hours' | 'last_30_days' | 'all';

export interface DeviceEvent {
  eventtype: string;
  eventtime: string;
  rawevent?: {
    location?: {
      latitude: number;
      longitude: number;
    };
    originalEvent?: {
      batt?: number;
      charging?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GetEventsResponse {
  data: DeviceEvent[];
  message?: string;
}

/** Events API matching backend routes */
export const eventsApi = {
  /**
   * POST /events/get-all-events - Get all events for a device
   * @param deviceId - Device ID (IMEI, serial, or UUID)
   * @param frequency - Time range for events
   * @param refresh - If true, bypass backend cache (use for pull-to-refresh)
   */
  async getEvents(
    deviceId: string,
    frequency: EventFrequency = 'last_24_hours',
    refresh = false,
  ): Promise<GetEventsResponse> {
    return apiClient.post<GetEventsResponse>('/events/get-all-events', {
      device_id: deviceId,
      frequency,
      refresh,
    });
  },

  /**
   * POST /events/get-events-by-type - Get events filtered by type
   * @param deviceId - Device ID (IMEI, serial, or UUID)
   * @param frequency - Time range for events
   * @param eventType - Event type filter (e.g., "Periodic Location", "Telemetry", "All")
   */
  async getEventsByType(
    deviceId: string,
    frequency: EventFrequency = 'last_24_hours',
    eventType: string = 'All',
  ): Promise<GetEventsResponse> {
    return apiClient.post<GetEventsResponse>('/events/get-events-by-type', {
      device_id: deviceId,
      frequency,
      event_type: eventType,
    });
  },
};
