import { apiClient } from './client';

export type DeviceIdType = 'imei' | 'serial' | 'uuid' | 'iccid';

export interface AddDeviceRequest {
  device_imei: string;
  sim_iccid?: string;
  device_type?: string;
  sim_action?: 'none' | 'activate' | 'deactivate';
  /** Optional user-friendly device name (stored in our DB; external Device API does not accept name) */
  name?: string;
}

export interface Device {
  id?: number;
  device_id: string;
  id_type: DeviceIdType;
  name?: string | null;
  status: string;
  battery_level?: number | null;
  signal_strength?: number | null;
  location?: {
    latitude: number;
    longitude: number;
    timestamp?: string | null;
  } | null;
  device_serial?: string | null;
  device_uuid?: string | null;
  sim_iccid?: string | null;
  device_type?: string | null;
  last_seen?: string | null;
  fall_detection_enabled?: boolean;
  account_name?: string | null; // Account name from external Account API (via cs_no)
  cs_no?: string | null; // Customer service number from external Device Read API
  // Device Read API fields
  imei?: string | null;
  caller_id?: string | null;
  fall_detection_status?: string | null;
  firmware_version?: string | null;
  sim_status?: string | null;
  service_company?: number | null;
  custom_reference_field?: string | null;
}

export interface AddDeviceResponse {
  message: string;
  device: Device;
}

export interface GetDevicesResponse {
  devices: Device[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface GetDeviceResponse {
  device: Device;
}

export interface FallDetectionResponse {
  status: 'ok';
  errors: [];
  fall_detection_status: 'active' | 'inactive' | 'pending';
  fall_detection_enabled: boolean;
}

// Fall Detection toggle interfaces removed - display only (matching reference app)

export interface RequestSignalResponse {
  message: string;
  device_id: string;
  id_type: DeviceIdType;
  result?: {
    status?: string;
    [key: string]: unknown;
  };
}

export interface UpdateDeviceNameResponse {
  message: string;
  device: { device_id: string; id_type: DeviceIdType; name: string | null };
}

/** Device API matching backend routes exactly */
export const deviceApi = {
  /**
   * POST /devices - Add a new device
   * Only seniors can register devices
   */
  async addDevice(payload: AddDeviceRequest): Promise<AddDeviceResponse> {
    return apiClient.post<AddDeviceResponse>('/devices', payload);
  },

  /**
   * GET /devices - Get all accessible devices
   * Supports pagination: ?page=1&limit=10
   */
  async getDevices(page?: number, limit?: number): Promise<GetDevicesResponse> {
    const params: Record<string, string> = {};
    if (page !== undefined) params.page = page.toString();
    if (limit !== undefined) params.limit = limit.toString();
    return apiClient.getWithParams<GetDevicesResponse>('/devices', params);
  },

  /**
   * GET /devices/:id_type/:id - Get specific device by ID
   */
  async getDevice(idType: DeviceIdType, id: string): Promise<GetDeviceResponse> {
    return apiClient.get<GetDeviceResponse>(`/devices/${idType}/${id}`);
  },

  /**
   * GET /devices/:id_type/:id/recent - Get most recent device information
   */
  async getDeviceRecent(idType: DeviceIdType, id: string): Promise<GetDeviceResponse> {
    return apiClient.get<GetDeviceResponse>(`/devices/${idType}/${id}/recent`);
  },

  /**
   * GET /devices/:id_type/:id/fall-detection - Get fall detection status
   */
  async getFallDetection(idType: DeviceIdType, id: string): Promise<FallDetectionResponse> {
    const response = await apiClient.get<FallDetectionResponse>(
      `/devices/${idType}/${id}/fall-detection`,
    );
    // Map response to include fall_detection_enabled for backward compatibility
    return {
      ...response,
      fall_detection_enabled: response.fall_detection_status === 'active',
    };
  },

  // Fall Detection toggle endpoints removed - display only (matching reference app)

  /**
   * POST /devices/:id_type/:id/signal - Request device signal
   */
  async requestSignal(idType: DeviceIdType, id: string): Promise<RequestSignalResponse> {
    return apiClient.post<RequestSignalResponse>(`/devices/${idType}/${id}/signal`);
  },

  /**
   * PATCH /devices/:id_type/:id/name - Set user-friendly device name
   * Only the account that registered the device can set its name. Stored in our DB; external Device API has no name endpoint.
   */
  async updateDeviceName(
    idType: DeviceIdType,
    id: string,
    name: string,
  ): Promise<UpdateDeviceNameResponse> {
    return apiClient.patch<UpdateDeviceNameResponse>(`/devices/${idType}/${id}/name`, { name });
  },
};
