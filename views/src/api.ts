export * from '@/lib/generated/api';
import {
  getApiV1Apps,
  getApiV1AppsId,
  deleteApiV1AppsId,
  getApiV1AppsIdShares,
  postApiV1AppsIdShare,
  deleteApiV1AppsIdSharesSid,
  getApiV1ClusterHealth,
  getApiV1Me,
  postAuthMagic,
  getAuthMagic,
  getAuthVerifyEmail,
  postAuthResendVerification,
  postAuthAgentToken,
  V1AppDTO,
  V1ShareResponseDTO,
} from '@/lib/generated/api';
import { App, AppStatus, ShareLink, SharePermission } from '@/types/app';
import { customMutator } from '@/lib/mutator';

export interface AppItem extends V1AppDTO {}
export interface ShareItem extends V1ShareResponseDTO {}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  created_at?: string;
}

export interface ClusterHealthResponse {
  status: string;
  nodes: number;
  active_vms: number;
  total_vms: number;
  memory?: {
    alloc_mb: number;
    total_alloc_mb: number;
    sys_mb: number;
    num_gc: number;
  };
  go_version?: string;
  goroutines?: number;
  uptime_seconds?: number;
}

export function mapBackendAppToApp(dto: V1AppDTO): App {
  const rawStatus = (dto.status || 'LIVE').toUpperCase();
  let status: AppStatus = 'LIVE';
  if (rawStatus === 'BUILDING' || rawStatus === 'PENDING') {
    status = 'BUILDING';
  } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR') {
    status = 'FAILED';
  } else if (rawStatus === 'DESTROYED' || rawStatus === 'STOPPED') {
    status = 'DESTROYED';
  } else {
    status = 'LIVE';
  }

  const appName = dto.name || 'MicroVM App';
  return {
    id: dto.id || '',
    name: appName,
    ownerEmail: dto.owner_email || 'user@agni.io',
    runtime: dto.runtime || 'kata-fc',
    imageRef: dto.image_ref || 'ghcr.io/indralab/microvm:latest',
    podName: dto.pod_name || `pod-${appName}`,
    serviceUrl: dto.service_url || `https://${appName}.agni.dev`,
    shareUrl: dto.share_url,
    status,
    errorMessage: dto.error_message,
    createdAt: dto.created_at || new Date().toISOString(),
    metrics: {
      cpuPercent: 0,
      memoryMB: 128,
      memoryLimitMB: 512,
      requestsPerSec: 0,
      activePods: status === 'LIVE' ? 1 : 0,
    },
    envVars: {},
    shareCount: 0,
  };
}

export function mapBackendShareToShareLink(dto: V1ShareResponseDTO): ShareLink {
  return {
    id: dto.id || '',
    appId: dto.app_id || '',
    recipientEmail: dto.recipient_email || '',
    permission: (dto.permission === 'admin' ? 'admin' : 'use') as SharePermission,
    tokenHash: dto.token || `tok_${dto.id}`,
    expiresAt: dto.expires_at || null,
    revokedAt: dto.revoked_at || null,
    acceptedAt: dto.accepted_at || null,
    createdAt: new Date().toISOString(),
  };
}

export const api = {
  get: <T = unknown>(url: string) => customMutator<T>({ url, method: 'GET' }),
  post: <T = unknown>(url: string, data?: unknown) =>
    customMutator<T>({ url, method: 'POST', data, headers: { 'Content-Type': 'application/json' } }),
  put: <T = unknown>(url: string, data?: unknown) =>
    customMutator<T>({ url, method: 'PUT', data, headers: { 'Content-Type': 'application/json' } }),
  delete: <T = unknown>(url: string) => customMutator<T>({ url, method: 'DELETE' }),

  getApps: async () => {
    const res = await getApiV1Apps();
    return (res || []) as AppItem[];
  },
  getApp: async (id: string) => {
    const res = await getApiV1AppsId(id);
    return res as AppItem;
  },
  createApp: async (data: { name: string; runtime?: string; imageRef?: string }) => {
    const formData = new FormData();
    formData.append('name', data.name);
    const res = await customMutator<V1AppDTO>({
      url: '/api/v1/apps',
      method: 'POST',
      data: formData,
    });
    return res as AppItem;
  },
  deleteApp: async (id: string) => {
    await deleteApiV1AppsId(id);
  },

  getAppShares: async (appId: string) => {
    const res = await getApiV1AppsIdShares(appId);
    return (res || []) as ShareItem[];
  },
  createAppShare: async (appId: string, recipientEmail: string, permission?: string) => {
    const res = await postApiV1AppsIdShare(appId, {
      app_id: appId,
      recipient_email: recipientEmail,
      permission: permission || 'use',
    });
    return res as ShareItem;
  },
  revokeAppShare: async (appId: string, shareId: string) => {
    await deleteApiV1AppsIdSharesSid(appId, shareId);
  },

  getClusterHealth: async () => {
    const res = await getApiV1ClusterHealth();
    return res as unknown as ClusterHealthResponse;
  },

  requestMagicLink: async (email: string) => {
    const res = await postAuthMagic({ email });
    return { success: true, message: (res as any)?.message || 'Magic link requested' };
  },
  verifyMagicToken: async (token: string) => {
    const res = await getAuthMagic({ token, redirect: 'false' });
    return res as unknown as { access_token?: string; user?: UserProfile };
  },
  verifyEmailToken: async (token: string) => {
    const res = await getAuthVerifyEmail({ token });
    return res as any;
  },
  resendVerification: async (email: string) => {
    const res = await postAuthResendVerification({ email });
    return res as any;
  },
  generateAgentToken: async (name?: string) => {
    const res = await postAuthAgentToken();
    return res as any;
  },
  getMe: async () => {
    const res = await getApiV1Me();
    return res as unknown as UserProfile;
  },
};
