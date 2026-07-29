export * from '@/lib/generated/api';

const BASE = '';

export interface AppItem {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'building' | 'stopped';
  memory: string;
  vcpu: number;
  ip: string;
  port: number;
  uptime: string;
  createdAt: string;
}

export interface ShareItem {
  id: string;
  appId: string;
  appName: string;
  token: string;
  access: 'read-only' | 'read-write' | 'admin';
  createdAt: string;
  expiresAt: string | null;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  created_at?: string;
}

// Initial mock state for offline fallback
const INITIAL_MOCK_APPS: AppItem[] = [
  {
    id: 'app_agni_01',
    name: 'Agni MicroVM Cluster',
    type: 'Kata MicroVM',
    status: 'running',
    memory: '512 MB',
    vcpu: 2,
    ip: '10.244.0.15',
    port: 8080,
    uptime: '4d 12h',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'app_agni_02',
    name: 'PostgreSQL Sandbox',
    type: 'Database Engine',
    status: 'running',
    memory: '1024 MB',
    vcpu: 1,
    ip: '10.244.0.18',
    port: 5432,
    uptime: '12d 6h',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'app_agni_03',
    name: 'Redis Cache Node',
    type: 'In-Memory Store',
    status: 'idle',
    memory: '256 MB',
    vcpu: 1,
    ip: '10.244.0.22',
    port: 6379,
    uptime: '1d 2h',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'app_agni_04',
    name: 'Next.js Web Runner',
    type: 'Serverless App',
    status: 'running',
    memory: '512 MB',
    vcpu: 2,
    ip: '10.244.0.30',
    port: 3000,
    uptime: '6h 45m',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const INITIAL_MOCK_SHARES: ShareItem[] = [
  {
    id: 'share_01',
    appId: 'app_agni_01',
    appName: 'Agni MicroVM Cluster',
    token: 'share_agni_k3s_9921',
    access: 'read-only',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  },
  {
    id: 'share_02',
    appId: 'app_agni_02',
    appName: 'PostgreSQL Sandbox',
    token: 'share_agni_pg_4410',
    access: 'read-write',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    expiresAt: null,
  },
];

function getStoredMockApps(): AppItem[] {
  try {
    const raw = localStorage.getItem('agni_mock_apps');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem('agni_mock_apps', JSON.stringify(INITIAL_MOCK_APPS));
  return INITIAL_MOCK_APPS;
}

function saveStoredMockApps(apps: AppItem[]) {
  localStorage.setItem('agni_mock_apps', JSON.stringify(apps));
}

function getStoredMockShares(): ShareItem[] {
  try {
    const raw = localStorage.getItem('agni_mock_shares');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem('agni_mock_shares', JSON.stringify(INITIAL_MOCK_SHARES));
  return INITIAL_MOCK_SHARES;
}

function saveStoredMockShares(shares: ShareItem[]) {
  localStorage.setItem('agni_mock_shares', JSON.stringify(shares));
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
  if (body) {
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[Agni API Offline Fallback] Using fallback handler for ${method} ${path}`, error);
    return handleMockRoute<T>(method, path, body);
  }
}

function handleMockRoute<T>(method: HttpMethod, path: string, body?: unknown): T {
  if (path === '/api/v1/me' || path.startsWith('/api/v1/me?') || path === '/me') {
    const mockUser: UserProfile = {
      user_id: 'usr_agni_dev_01',
      name: 'Agni Developer',
      email: 'dev@agni.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'Cluster Admin',
      created_at: new Date().toISOString(),
    };
    return mockUser as unknown as T;
  }

  if (path === '/auth/login' || path === '/auth/register') {
    return {
      access_token: 'demo_jwt_token_agni_2026',
      refresh_token: 'demo_refresh_token_agni_2026',
      expires_at: Date.now() + 86400000,
    } as unknown as T;
  }

  if (path === '/auth/magic' || path === '/auth/magic-link') {
    return {
      success: true,
      message: 'Magic link dispatched successfully to your email inbox.',
    } as unknown as T;
  }

  if (path === '/auth/agent-token') {
    const agentName = (body as { name?: string })?.name || 'agni-mcp-agent-01';
    const fakeJwt = `eyJhY2Nlc3NfdG9rZW4iOiJhd3Nfc2VjcmV0Iiwic3ViIjoiYWduaV9tY3BfYWdlbnQiLCJuYW1lIjoi${btoa(agentName)}.eyJyb2xlIjoiYWdlbnQiLCJjbHVzdGVyIjoiazNzLW5vZGUtMDEiLCJpYXQiOjE3NTM3NjQ4MDB9.AgniMcpSignature2026`;
    return {
      token: fakeJwt,
      agentId: `agent_${Math.random().toString(36).substring(2, 9)}`,
    } as unknown as T;
  }

  if ((path === '/api/v1/apps' || path === '/apps') && method === 'GET') {
    return getStoredMockApps() as unknown as T;
  }

  if ((path === '/api/v1/apps' || path === '/apps') && method === 'POST') {
    const apps = getStoredMockApps();
    const newAppData = body as Partial<AppItem>;
    const newApp: AppItem = {
      id: `app_agni_${Math.random().toString(36).substring(2, 7)}`,
      name: newAppData.name || 'New MicroVM App',
      type: newAppData.type || 'Kata Container',
      status: 'running',
      memory: newAppData.memory || '512 MB',
      vcpu: newAppData.vcpu || 1,
      ip: `10.244.0.${Math.floor(Math.random() * 200) + 10}`,
      port: newAppData.port || 8080,
      uptime: 'Just created',
      createdAt: new Date().toISOString(),
    };
    apps.unshift(newApp);
    saveStoredMockApps(apps);
    return newApp as unknown as T;
  }

  if ((path.startsWith('/api/v1/apps/') || path.startsWith('/apps/')) && method === 'DELETE') {
    const appId = path.replace('/api/v1/apps/', '').replace('/apps/', '');
    let apps = getStoredMockApps();
    apps = apps.filter((a) => a.id !== appId);
    saveStoredMockApps(apps);
    return { success: true, id: appId } as unknown as T;
  }

  if ((path === '/api/v1/shares' || path === '/shares') && method === 'GET') {
    return getStoredMockShares() as unknown as T;
  }

  if ((path === '/api/v1/shares' || path === '/shares') && method === 'POST') {
    const shares = getStoredMockShares();
    const reqBody = body as { appId?: string; access?: 'read-only' | 'read-write' | 'admin' };
    const apps = getStoredMockApps();
    const targetApp = apps.find((a) => a.id === reqBody.appId) || apps[0];
    const newShare: ShareItem = {
      id: `share_${Math.random().toString(36).substring(2, 8)}`,
      appId: targetApp?.id || 'app_agni_01',
      appName: targetApp?.name || 'Agni MicroVM Cluster',
      token: `share_agni_${Math.random().toString(36).substring(2, 8)}`,
      access: reqBody.access || 'read-only',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    };
    shares.unshift(newShare);
    saveStoredMockShares(shares);
    return newShare as unknown as T;
  }

  return {} as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),

  getApps: () => request<AppItem[]>('GET', '/api/v1/apps'),
  createApp: (data: Partial<AppItem>) => request<AppItem>('POST', '/api/v1/apps', data),
  deleteApp: (id: string) => request<{ success: boolean }>('DELETE', `/api/v1/apps/${id}`),

  getShares: () => request<ShareItem[]>('GET', '/shares'),
  createShare: (appId: string, access?: 'read-only' | 'read-write' | 'admin') =>
    request<ShareItem>('POST', '/shares', { appId, access }),
  revokeShare: (shareId: string) => request<{ success: boolean }>('DELETE', `/shares/${shareId}`),

  requestMagicLink: (email: string) =>
    request<{ success: boolean; message: string }>('POST', '/auth/magic', { email }),
  verifyMagicToken: (token: string) =>
    request<{ access_token: string; user: UserProfile }>('POST', '/auth/verify', { token }),
  generateAgentToken: (name?: string) =>
    request<{ token: string; agentId: string }>('POST', '/auth/agent-token', { name }),
  getMe: () => request<UserProfile>('GET', '/api/v1/me'),
};
