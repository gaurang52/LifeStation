import { apiClient } from './client';

export interface Caregiver {
  id: number;
  name: string;
  email: string;
  mobile: string;
  user_type: string;
  address: string;
  gender: string;
  notification_enabled: boolean;
  extra_info: {
    isPro: boolean;
  };
  status: string;
  relationship_with_senior?: string;
}

export interface CaregiversResponse {
  data: Caregiver[];
  message: string;
}

export interface AddCaregiverRequest {
  email: string;
  relationship_with_senior?: string;
}

export interface AddCaregiverResponse {
  message: string;
  data: {
    id: number;
    caregiver_id: number;
    caregiver: {
      id: number;
      name: string;
      email: string;
      mobile: string | null;
    };
    relationship_with_senior: string;
  };
}

export interface DeleteCaregiverRequest {
  caregiver_id: number;
}

export interface DeleteCaregiverResponse {
  message: string;
}

/** Caregiver API matching backend routes exactly */
export const caregiverApi = {
  /**
   * GET /senior/get-mapped-caregiver-list
   * Get all caregivers mapped to the authenticated senior user
   */
  async getCaregivers(): Promise<CaregiversResponse> {
    return apiClient.get<CaregiversResponse>('/senior/get-mapped-caregiver-list');
  },

  /**
   * POST /senior/add-caregiver
   * Add a caregiver to the authenticated senior user by email
   */
  async addCaregiver(payload: AddCaregiverRequest): Promise<AddCaregiverResponse> {
    return apiClient.post<AddCaregiverResponse>('/senior/add-caregiver', payload);
  },

  /**
   * POST /senior/delete-caregiver
   * Remove a caregiver from the authenticated senior user's care circle
   */
  async deleteCaregiver(payload: DeleteCaregiverRequest): Promise<DeleteCaregiverResponse> {
    return apiClient.post<DeleteCaregiverResponse>('/senior/delete-caregiver', payload);
  },

  /**
   * GET /caregiver/get-mapped-seniors-list
   * Get all seniors mapped to the authenticated caregiver user
   */
  async getSeniors(): Promise<CaregiversResponse> {
    return apiClient.get<CaregiversResponse>('/caregiver/get-mapped-seniors-list');
  },
};
