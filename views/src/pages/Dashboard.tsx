import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  HardDrive,
  Activity,
  ShieldCheck,
  RefreshCw,
  Server,
  Filter,
} from 'lucide-react';
import { App, AppStatus, ShareLink } from '@/types/app';
import { api, mapBackendAppToApp, mapBackendShareToShareLink, ClusterHealthResponse } from '@/api';
import { AppCard } from '@/components/dashboard/AppCard';
import { DeploySimulatorModal } from '@/components/dashboard/DeploySimulatorModal';
import { ShareModal } from '@/components/dashboard/ShareModal';
import { LogViewer } from '@/components/dashboard/LogViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Dashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [shareLinksMap, setShareLinksMap] = useState<Record<string, ShareLink[]>>({});
  const [clusterHealth, setClusterHealth] = useState<ClusterHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedAppForShare, setSelectedAppForShare] = useState<App | null>(null);
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<App | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rawApps, health] = await Promise.all([
        api.getApps().catch(() => []),
        api.getClusterHealth().catch(() => null),
      ]);
      const mappedApps = rawApps.map(mapBackendAppToApp);
      setApps(mappedApps);
      setClusterHealth(health);

      // Load share links for each app
      const shareMap: Record<string, ShareLink[]> = {};
      await Promise.all(
        mappedApps.map(async (appItem) => {
          try {
            const shares = await api.getAppShares(appItem.id);
            shareMap[appItem.id] = shares.map(mapBackendShareToShareLink);
          } catch {
            shareMap[appItem.id] = [];
          }
        })
      );
      setShareLinksMap(shareMap);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load workspace applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cluster health aggregate metrics calculation
  const clusterMetrics = useMemo(() => {
    const activeApps = apps.filter((a) => a.status === 'LIVE' || a.status === 'BUILDING');
    const totalPods = activeApps.reduce((acc, a) => acc + (a.metrics.activePods || 1), 0);
    const totalMemMB = clusterHealth?.memory?.sys_mb || activeApps.reduce((acc, a) => acc + a.metrics.memoryMB, 0);

    return {
      activeMicroVMs: clusterHealth?.active_vms ?? totalPods,
      totalAppsCount: apps.length,
      memoryAllocatedGB: (totalMemMB / 1024).toFixed(2),
      memoryCapacityGB: 32,
      requestsPerSec: 0,
    };
  }, [apps, clusterHealth]);

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          app.imageRef.toLowerCase().includes(q) ||
          app.runtime.toLowerCase().includes(q) ||
          app.podName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [apps, statusFilter, searchQuery]);

  const handleDeploySuccess = (newApp: App) => {
    setApps((prev) => [newApp, ...prev]);
    loadData();
  };

  const handleDestroyApp = async (appToDestroy: App) => {
    try {
      await api.deleteApp(appToDestroy.id);
      setApps((prev) => prev.filter((a) => a.id !== appToDestroy.id));
      toast.success(`App ${appToDestroy.name} destroyed`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to destroy ${appToDestroy.name}`);
    }
  };

  const handleRedeployApp = (appItem: App) => {
    toast.info(`Redeploying ${appItem.name}...`);
    loadData();
  };

  const handleGenerateShareLink = async (
    appId: string,
    recipientEmail: string,
    permission: 'use' | 'admin'
  ) => {
    try {
      const res = await api.createAppShare(appId, recipientEmail, permission);
      const newShareLink = mapBackendShareToShareLink(res);
      setShareLinksMap((prev) => ({
        ...prev,
        [appId]: [...(prev[appId] || []), newShareLink],
      }));
      toast.success(`Share link created for ${recipientEmail}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create share link');
    }
  };

  const handleRevokeShareLink = async (linkId: string) => {
    if (!selectedAppForShare) return;
    const appId = selectedAppForShare.id;
    try {
      await api.revokeAppShare(appId, linkId);
      setShareLinksMap((prev) => ({
        ...prev,
        [appId]: (prev[appId] || []).filter((l) => l.id !== linkId),
      }));
      toast.success('Share link revoked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke share link');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Agni Workspaces</h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-2"
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> Kata / Firecracker Runtime
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage hardware-isolated MicroVM containers with instant deployment and zero-trust sharing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadData()}
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={() => setIsDeployModalOpen(true)}
            className="h-9 text-xs font-semibold shadow-md gap-1.5"
          >
            <Plus className="h-4 w-4" /> New Deploy
          </Button>
        </div>
      </div>

      {/* Cluster Health Bar / Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active MicroVMs */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Active MicroVM Pods
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {clusterMetrics.activeMicroVMs}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {clusterMetrics.totalAppsCount} Apps
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Memory Allocation */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Cluster Memory System
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {clusterMetrics.memoryAllocatedGB} GB
                </span>
                <span className="text-xs text-muted-foreground">
                  / {clusterMetrics.memoryCapacityGB} GB Sys
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Cluster Requests */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Goroutines / Workers
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {clusterHealth?.goroutines ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  Goroutines
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Runtime Environment */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Isolation Status
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold tracking-tight text-emerald-400">
                  {clusterHealth?.status || 'Active'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({clusterHealth?.go_version || 'Go'})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/30 p-3 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps by name, runtime or image..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-background/80"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32 text-xs rounded-xl bg-background/80">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent side="bottom" className="text-xs">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="BUILDING">Building</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="DESTROYED">Destroyed</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Grid vs List View mode buttons */}
          <div className="flex items-center bg-background/80 p-0.5 rounded-xl border border-border">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main MicroVM App Grid / List Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading applications from cluster...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="p-12 text-center bg-card/20 border-dashed border-2 border-border/60">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No MicroVM Applications</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {apps.length === 0
                ? 'You do not have any deployed applications yet. Click below to launch your first MicroVM.'
                : 'No applications match your current search query or status filter.'}
            </p>
            {apps.length === 0 && (
              <Button onClick={() => setIsDeployModalOpen(true)} className="gap-2 text-xs">
                <Plus className="h-4 w-4" /> Deploy MicroVM
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'flex flex-col gap-3'
          }
        >
          {filteredApps.map((appItem) => (
            <AppCard
              key={appItem.id}
              app={appItem}
              onOpenShare={(targetApp) => setSelectedAppForShare(targetApp)}
              onOpenLogs={(targetApp) => setSelectedAppForLogs(targetApp)}
              onDestroy={handleDestroyApp}
              onRedeploy={handleRedeployApp}
            />
          ))}
        </div>
      )}

      {/* Deploy MicroVM Modal */}
      <DeploySimulatorModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploySuccess={handleDeploySuccess}
      />

      {/* Zero Trust Sharing Link Modal */}
      <ShareModal
        app={selectedAppForShare}
        isOpen={!!selectedAppForShare}
        onClose={() => setSelectedAppForShare(null)}
        shareLinks={selectedAppForShare ? shareLinksMap[selectedAppForShare.id] || [] : []}
        onGenerateShareLink={handleGenerateShareLink}
        onRevokeShareLink={handleRevokeShareLink}
      />

      {/* Real-time Log Stream Viewer Modal */}
      <Dialog
        open={!!selectedAppForLogs}
        onOpenChange={(open) => !open && setSelectedAppForLogs(null)}
      >
        <DialogContent className="sm:max-w-[850px] bg-card border-border p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              MicroVM Logs: {selectedAppForLogs?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAppForLogs && (
            <LogViewer
              appId={selectedAppForLogs.id}
              appName={selectedAppForLogs.name}
              height="h-[520px]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
