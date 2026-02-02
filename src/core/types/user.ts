export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  user_type: 'ADMIN' | 'SUPER_ADMIN' | 'caregiver' | 'senior';
  address?: string | null;
  gender?: string | null;
  fcm_token?: string | null;
  platform?: string | null;
  status: string;
  privacy_accepted?: boolean;
  terms_accepted?: boolean;
  extra_info?: {
    isPro?: boolean;
  };
  cs_no?: string | null;
  notification_enabled?: boolean;
  created_at: string;
}
