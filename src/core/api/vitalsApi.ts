import { apiClient } from './client';

export interface VitalData {
  timestamp: string;
  heart_rate?: number | null;
  blood_pressure?: {
    systolic?: number | null;
    diastolic?: number | null;
  } | null;
  temperature?: number | null;
  oxygen_saturation?: number | null;
  steps?: number | null;
  [key: string]: unknown;
}

export interface GetRecentVitalsResponse {
  vitals: VitalData[];
  senior_id: number;
  cached?: boolean;
  warning?: string;
}

/** Vitals API matching backend routes exactly */
export const vitalsApi = {
  /**
   * GET /vitals/recent?senior_id=123 - Get recent vitals for a senior
   */
  async getRecentVitals(seniorId: number): Promise<GetRecentVitalsResponse> {
    return apiClient.getWithParams<GetRecentVitalsResponse>('/vitals/recent', {
      senior_id: seniorId.toString(),
    });
  },

  /**
   * GET /vitals/download?senior_id=123&format=csv|pdf - Download vitals report
   */
  async downloadVitalsReport(
    seniorId: number,
    format: 'csv' | 'pdf' = 'csv',
  ): Promise<{ data: string; filename: string; contentType: string }> {
    return apiClient.downloadFile('/vitals/download', {
      senior_id: seniorId.toString(),
      format,
    });
  },
};
