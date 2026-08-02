export * from '@/lib/generated/api';
import {
  getApiV1Apps,
  getApiV1AppsId,
  deleteApiV1AppsId,
  postApiV1Apps,
  postApiV1AppsIdDeploy,
  postApiV1AppsIdUploadUrl,
  postApiV1AppsIdMultipartInit,
  postApiV1AppsIdMultipartComplete,
  postApiV1AppsIdMultipartAbort,
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
  InternalAdaptersHttpWebV1AppDTO,
  InternalAdaptersHttpWebV1ShareResponseDTO,
  GithubComSurggedAgniInternalPortsMultipartUploadInit,
  GithubComSurggedAgniInternalPortsPartUploadURL,
  GithubComSurggedAgniInternalPortsUploadedPart,
} from '@/lib/generated/api';
import { App, AppStatus, ShareLink, SharePermission } from '@/types/app';
import { customMutator } from '@/lib/mutator';

export interface AppItem extends InternalAdaptersHttpWebV1AppDTO {}
export interface ShareItem extends InternalAdaptersHttpWebV1ShareResponseDTO {}

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

export function mapBackendAppToApp(dto: InternalAdaptersHttpWebV1AppDTO): App {
  const rawStatus = (dto.status || 'LIVE').toUpperCase();
  let status: AppStatus = 'LIVE';
  if (rawStatus === 'BUILDING' || rawStatus === 'PENDING' || rawStatus === 'QUEUED') {
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
    runtime: dto.runtime || 'kata',
    imageRef: dto.image_ref || 'ghcr.io/indralab/microvm:latest',
    podName: dto.pod_name || `pod-${appName}`,
    serviceUrl: dto.service_url || `https://${appName}.agni.dev`,
    shareUrl: dto.share_url,
    status,
    errorMessage: dto.error_message || undefined,
    failedStep: dto.failed_step || undefined,
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

export function mapBackendShareToShareLink(dto: InternalAdaptersHttpWebV1ShareResponseDTO): ShareLink {
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

export interface CreateAppResponse {
  id: string;
  slug: string;
  upload_url: string;
  upload_expires_at: string;
}

// Type aliases for multipart — sourced from the generated API.
export type PartUploadURL = GithubComSurggedAgniInternalPortsPartUploadURL;
export type MultipartUploadInit = GithubComSurggedAgniInternalPortsMultipartUploadInit;
export type UploadedPart = GithubComSurggedAgniInternalPortsUploadedPart;

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB

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
  createApp: async (data: { name: string; port?: number; runtime?: string }) => {
    const res = await postApiV1Apps({
      name: data.name,
      port: data.port || 8080,
      runtime: data.runtime || 'kata',
    });
    return res as unknown as CreateAppResponse;
  },
  deployApp: async (id: string) => {
    const res = await postApiV1AppsIdDeploy(id);
    return res;
  },
  uploadZipToPresignedUrl: async (uploadUrl: string, file: File, onProgress?: (percent: number) => void) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/zip');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during archive upload'));
      };

      xhr.send(file);
    });
  },

  uploadFileSmart: async (
    appId: string,
    fallbackUrl: string,
    file: File,
    onProgress?: (percent: number, statusText: string) => void
  ) => {
    if (file.size > MULTIPART_THRESHOLD) {
      return api.multipartUpload(appId, file, onProgress);
    }
    return api.uploadZipToPresignedUrl(fallbackUrl, file, onProgress
      ? (pct) => onProgress(pct, `Uploading archive... ${pct}%`)
      : undefined
    );
  },

  multipartUpload: async (
    appId: string,
    file: File,
    onProgress?: (percent: number, statusText: string) => void
  ) => {
    // 1. Initialize multipart upload
    onProgress?.(0, 'Initializing multipart upload...');
    const init = await postApiV1AppsIdMultipartInit(appId, { total_size: file.size });
    if (!init?.parts?.length || !init?.upload_id) {
      throw new Error('Multipart upload initialization failed');
    }

    const partSize = Math.ceil(file.size / init.parts.length);
    const uploadedParts: UploadedPart[] = [];
    const totalParts = init.parts.length;
    const totalSize = file.size;

    // Per-part bytes uploaded so far (keyed by part index).
    const partBytes = new Array<number>(totalParts).fill(0);
    const partSizes = new Array<number>(totalParts);
    for (let i = 0; i < totalParts; i++) {
      partSizes[i] = Math.min(partSize, totalSize - i * partSize);
    }

    const report = () => {
      const done = partBytes.reduce((a, b) => a + b, 0);
      const pct = Math.round((done / totalSize) * 100);
      onProgress?.(pct, `Uploading archive... ${pct}%`);
    };

    try {
      // 2. Upload parts with parallel limited concurrency (max 4 concurrent)
      const concurrency = 4;
      for (let batch = 0; batch < totalParts; batch += concurrency) {
        const batchEnd = Math.min(batch + concurrency, totalParts);
        const batchPromises: Promise<void>[] = [];

        for (let i = batch; i < batchEnd; i++) {
          const part = init.parts[i];
          const start = i * partSize;
          const end = Math.min(start + partSize, totalSize);
          const partBlob = file.slice(start, end);
          const idx = i;

          batchPromises.push(
            (async () => {
              const etag = await api.uploadPartToUrl(part.upload_url!, partBlob, (partPct) => {
                partBytes[idx] = (partSizes[idx] * partPct) / 100;
                report();
              });
              partBytes[idx] = partSizes[idx];
              uploadedParts.push({
                part_number: part.part_number!,
                etag,
              });
            })()
          );
        }
        await Promise.all(batchPromises);
        report();
      }

      // 3. Complete multipart upload
      onProgress?.(100, 'Completing multipart upload...');
      await postApiV1AppsIdMultipartComplete(appId, {
        upload_id: init.upload_id,
        parts: uploadedParts.sort((a, b) => (a.part_number || 0) - (b.part_number || 0)),
      });
    } catch (err) {
      // Abort on failure
      try {
        await postApiV1AppsIdMultipartAbort(appId, { upload_id: init.upload_id });
      } catch { /* ignore abort errors */ }
      throw err;
    }
  },

  uploadPartToUrl: async (uploadUrl: string, blob: Blob, onPartProgress?: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      if (xhr.upload && onPartProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onPartProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
          resolve(etag.replace(/^["']|["']$/g, ''));
        } else {
          reject(new Error(`Part upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during part upload'));
      };

      xhr.send(blob);
    });
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
