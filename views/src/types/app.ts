export type AppStatus = 'LIVE' | 'BUILDING' | 'FAILED' | 'DESTROYED';

export type AppRuntime = 'kata-fc' | 'firecracker' | 'gvisor' | 'runc';

export interface AppMetrics {
  cpuPercent: number;
  memoryMB: number;
  memoryLimitMB: number;
  requestsPerSec: number;
  activePods?: number;
  networkRxKbps?: number;
  networkTxKbps?: number;
}

export interface App {
  id: string;
  name: string;
  ownerEmail: string;
  runtime: AppRuntime | string;
  imageRef: string;
  podName: string;
  serviceUrl: string;
  shareUrl?: string;
  status: AppStatus;
  errorMessage?: string;
  createdAt: string;
  metrics: AppMetrics;
  envVars?: Record<string, string>;
  shareCount?: number;
}

export type SharePermission = 'use' | 'admin';

export interface ShareLink {
  id: string;
  appId: string;
  recipientEmail: string;
  permission: SharePermission;
  tokenHash: string;
  expiresAt: string | null; // ISO date string or null if never
  revokedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogStream = 'stdout' | 'stderr';

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  stream: LogStream;
}
