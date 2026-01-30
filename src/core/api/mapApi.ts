import { apiClient } from './client';

export interface GeofenceSettings {
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
}

export interface SaveGeofenceRequest {
  device_id: string;
  settings: GeofenceSettings;
}

export interface SaveGeofenceResponse {
  message: string;
}

export interface GetGeofenceRequest {
  device_id: string;
}

export interface GetGeofenceResponse {
  data: {
    device_id: string;
    geo_fence_settings: GeofenceSettings;
    extra_information?: Record<string, unknown>;
  };
  message: string;
}

/** Map API for geofence operations matching backend routes */
export const mapApi = {
  /**
   * POST /devices/save-geo-fence-settings - Save or update geofence settings
   * @param deviceId - Device ID (IMEI, serial, or UUID)
   * @param lat - Latitude of geofence center
   * @param lng - Longitude of geofence center
   * @param radius - Radius in meters
   */
  async saveGeofence(
    deviceId: string,
    lat: number,
    lng: number,
    radius: number,
  ): Promise<SaveGeofenceResponse> {
    return apiClient.post<SaveGeofenceResponse>('/devices/save-geo-fence-settings', {
      device_id: deviceId,
      settings: {
        center: {
          lat,
          lng,
        },
        radius,
      },
    });
  },

  /**
   * POST /devices/get-geo-fence-settings - Get geofence settings for a device
   * @param deviceId - Device ID (IMEI, serial, or UUID)
   */
  async getGeofence(deviceId: string): Promise<GetGeofenceResponse> {
    return apiClient.post<GetGeofenceResponse>('/devices/get-geo-fence-settings', {
      device_id: deviceId,
    });
  },
};
