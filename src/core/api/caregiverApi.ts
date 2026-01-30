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
    // For direct mapping (caregiver exists)
    id?: number;
    caregiver_id?: number;
    caregiver?: {
      id: number;
      name: string;
      email: string;
      mobile: string | null;
    };
    relationship_with_senior?: string;
    // For invitation (caregiver doesn't exist)
    invitation_id?: number;
    caregiver_email?: string;
    status?: string;
    expires_at?: string;
    created_at?: string;
  };
}

export interface CaregiverInvitation {
  id: number;
  caregiver_email: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  relationship_with_senior: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
}

export interface InvitationsResponse {
  data: CaregiverInvitation[];
  message: string;
}

export interface CreateInvitationRequest {
  email: string;
  relationship_with_senior?: string;
}

export interface CreateInvitationResponse {
  message: string;
  data: {
    id: number;
    caregiver_email: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
}

export interface DeleteCaregiverRequest {
  caregiver_id: number;
}

export interface DeleteCaregiverResponse {
  message: string;
}

export interface SendHelpNotificationResponse {
  message: string;
  data: {
    senior_id: number;
    senior_name: string;
    timestamp: string;
    notifications: {
      sent: number;
      failed: number;
      total: number;
      errors: Array<{
        caregiverId: number;
        error: string;
      }>;
    };
  };
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

  /**
   * POST /senior/caregivers/invite
   * Create a new caregiver invitation
   */
  async createInvitation(payload: CreateInvitationRequest): Promise<CreateInvitationResponse> {
    return apiClient.post<CreateInvitationResponse>('/senior/caregivers/invite', payload);
  },

  /**
   * GET /senior/caregivers/invitations
   * List all invitations for the authenticated senior
   */
  async listInvitations(): Promise<InvitationsResponse> {
    return apiClient.get<InvitationsResponse>('/senior/caregivers/invitations');
  },

  /**
   * POST /senior/caregivers/invitations/:invitationId/resend
   * Resend an invitation
   */
  async resendInvitation(invitationId: number): Promise<CreateInvitationResponse> {
    return apiClient.post<CreateInvitationResponse>(
      `/senior/caregivers/invitations/${invitationId}/resend`,
    );
  },

  /**
   * POST /senior/caregivers/invitations/:invitationId/revoke
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: number): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      `/senior/caregivers/invitations/${invitationId}/revoke`,
    );
  },

  /**
   * POST /senior/help
   * Send a help/emergency notification to all mapped caregivers
   */
  async sendHelpNotification(): Promise<SendHelpNotificationResponse> {
    return apiClient.post<SendHelpNotificationResponse>('/senior/help');
  },
};
