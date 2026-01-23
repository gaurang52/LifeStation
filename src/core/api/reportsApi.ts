import { apiClient } from './client';

export interface Report {
  [key: string]: unknown;
}

export interface GetRecentReportsResponse {
  reports: Report[];
  count: number;
  device_id: string;
  cs_no: string;
}

export interface DownloadReportsResponse {
  data: string;
  filename: string;
  contentType: string;
}

/** Reports API matching backend routes exactly */
export const reportsApi = {
  /**
   * GET /reports/recent?device_id=...&id_type=... - Get recent reports for a device
   */
  async getRecentReports(deviceId: string, idType?: string): Promise<GetRecentReportsResponse> {
    const params: Record<string, string> = {
      device_id: deviceId,
    };
    if (idType) {
      params.id_type = idType;
    }
    return apiClient.getWithParams<GetRecentReportsResponse>('/reports/recent', params);
  },

  /**
   * GET /reports/recent/download?device_id=...&format=csv|json|pdf - Download recent reports
   * Uses the Recent Reports API endpoint from Postman collection
   */
  async downloadRecentReports(
    deviceId: string,
    format: 'csv' | 'json' | 'pdf' = 'json',
    idType?: string,
  ): Promise<DownloadReportsResponse> {
    const params: Record<string, string> = {
      device_id: deviceId,
      format,
    };
    if (idType) {
      params.id_type = idType;
    }

    // For PDF, we need to handle binary data
    if (format === 'pdf') {
      return apiClient.downloadFile('/reports/recent/download', params);
    }

    return apiClient.downloadFile('/reports/recent/download', params);
  },
};
