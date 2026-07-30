export * from '@/lib/generated/api';
import { App, AppStatus, ShareLink, SharePermission } from '@/types/app';

const BASE = '';

export interface AppItem {
  id: string;
  owner_email?: string;
  name: string;
  runtime?: string;
  image_ref?: string;
  pod_name?: string;
  service_url?: string;
  share_url?: string;
  status?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShareItem {
  id: string;
  app_id: string;
  recipient_email: string;
  permission: string;
  token?: string;
  expires_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
}

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

export function mapBackendAppToApp(dto: AppItem): App {
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

export function mapBackendShareToShareLink(dto: ShareItem): ShareLink {
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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
}

async function request<T = unknown>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('agni_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts: RequestOptions = { method, headers };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),

  getApps: () => request<AppItem[]>('GET', '/api/v1/apps'),
  getApp: (id: string) => request<AppItem>('GET', `/api/v1/apps/${id}`),
  createApp: (data: { name: string; runtime?: string; imageRef?: string }) =>
    request<AppItem>('POST', '/api/v1/apps', data),
  deleteApp: (id: string) => request<void>('DELETE', `/api/v1/apps/${id}`),

  getAppShares: (appId: string) => request<ShareItem[]>('GET', `/api/v1/apps/${appId}/shares`),
  createAppShare: (appId: string, recipientEmail: string, permission?: string) =>
    request<ShareItem>('POST', `/api/v1/apps/${appId}/share`, {
      recipient_email: recipientEmail,
      permission: permission || 'use',
    }),
  revokeAppShare: (appId: string, shareId: string) =>
    request<void>('DELETE', `/api/v1/apps/${appId}/shares/${shareId}`),

  getClusterHealth: () => request<ClusterHealthResponse>('GET', '/api/v1/cluster/health'),

  requestMagicLink: (email: string) =>
    request<{ success: boolean; message: string }>('POST', '/auth/magic', { email }),
  verifyMagicToken: (token: string) =>
    request<{ access_token: string; user: UserProfile }>('POST', '/auth/verify', { token }),
  verifyEmailToken: (token: string) =>
    request<{ access_token: string; refresh_token?: string; expires_at?: number; user?: UserProfile }>(
      'GET',
      `/auth/verify-email?token=${encodeURIComponent(token)}`
    ),
  resendVerification: (email: string) =>
    request<{ message: string }>('POST', '/auth/resend-verification', { email }),
  generateAgentToken: (name?: string) =>
    request<{ token: string; agentId: string }>('POST', '/auth/agent-token', { name }),
  getMe: () => request<UserProfile>('GET', '/api/v1/me'),
};
