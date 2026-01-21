import { apiClient } from './client';
import { useAuthStore } from '@core/store';

/** Call once at app boot so the API client can attach the auth token to requests. */
apiClient.setTokenGetter(() => useAuthStore.getState().token ?? null);
