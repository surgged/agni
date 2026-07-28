import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Cpu,
  HardDrive,
  Activity,
  ShieldCheck,
  RefreshCw,
  Server,
  Layers,
  Filter,
} from 'lucide-react';
import { App, AppStatus, ShareLink } from '@/types/app';
import { INITIAL_MOCK_APPS, INITIAL_MOCK_SHARE_LINKS } from '@/data/mockApps';
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
  const [apps, setApps] = useState<App[]>(INITIAL_MOCK_APPS);
  const [shareLinksMap, setShareLinksMap] = useState<Record<string, ShareLink[]>>(
    INITIAL_MOCK_SHARE_LINKS
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedAppForShare, setSelectedAppForShare] = useState<App | null>(null);
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<App | null>(null);

  // Cluster health aggregate metrics calculation
  const clusterMetrics = useMemo(() => {
    const activeApps = apps.filter((a) => a.status === 'LIVE' || a.status === 'BUILDING');
    const totalPods = activeApps.reduce((acc, a) => acc + (a.metrics.activePods || 1), 0);
    const totalMemMB = activeApps.reduce((acc, a) => acc + a.metrics.memoryMB, 0);
    const totalRps = activeApps.reduce((acc, a) => acc + a.metrics.requestsPerSec, 0);

    return {
      activeMicroVMs: totalPods,
      totalAppsCount: apps.length,
      memoryAllocatedGB: (totalMemMB / 1024).toFixed(2),
      memoryCapacityGB: 32,
      requestsPerSec: totalRps,
    };
  }, [apps]);

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
  };

  const handleDestroyApp = (appToDestroy: App) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === appToDestroy.id
          ? {
              ...a,
              status: 'DESTROYED' as AppStatus,
              metrics: { ...a.metrics, cpuPercent: 0, memoryMB: 0, requestsPerSec: 0 },
            }
          : a
      )
    );
    toast.success(`App ${appToDestroy.name} has been destroyed`);
  };

  const handleRedeployApp = (app: App) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === app.id ? { ...a, status: 'BUILDING' as AppStatus } : a
      )
    );
    toast.info(`Redeploying ${app.name}...`);
    setTimeout(() => {
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? {
                ...a,
                status: 'LIVE' as AppStatus,
                createdAt: new Date().toISOString(),
              }
            : a
        )
      );
      toast.success(`${app.name} is back LIVE!`);
    }, 3000);
  };

  const handleGenerateShareLink = (
    appId: string,
    recipientEmail: string,
    permission: 'use' | 'admin',
    expirationHours: number | null
  ) => {
    const expiresAt = expirationHours
      ? new Date(Date.now() + expirationHours * 3600 * 1000).toISOString()
      : null;

    const newLink: ShareLink = {
      id: `sh-${Date.now()}`,
      appId,
      recipientEmail,
      permission,
      tokenHash: `tok_${Math.random().toString(36).substring(2, 10)}`,
      expiresAt,
      revokedAt: null,
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    };

    setShareLinksMap((prev) => {
      const existing = prev[appId] || [];
      return { ...prev, [appId]: [...existing, newLink] };
    });

    setApps((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, shareCount: (a.shareCount || 0) + 1 } : a
      )
    );
  };

  const handleRevokeShareLink = (linkId: string) => {
    if (!selectedAppForShare) return;
    const appId = selectedAppForShare.id;

    setShareLinksMap((prev) => {
      const list = prev[appId] || [];
      return {
        ...prev,
        [appId]: list.map((l) =>
          l.id === linkId ? { ...l, revokedAt: new Date().toISOString() } : l
        ),
      };
    });

    setApps((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, shareCount: Math.max(0, (a.shareCount || 1) - 1) } : a
      )
    );
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
                Cluster Memory Allocated
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {clusterMetrics.memoryAllocatedGB} GB
                </span>
                <span className="text-xs text-muted-foreground">
                  / {clusterMetrics.memoryCapacityGB} GB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Total Requests / Sec */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Total Throughput
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {clusterMetrics.requestsPerSec.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">req/sec</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Hypervisor Engine */}
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Hypervisor Engine
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Firecracker v1.6.0
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Filter Bar: Search, Status Dropdown, View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search apps, image refs, pods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-muted/30"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-[140px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-muted/30">
                <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="LIVE">LIVE</SelectItem>
                <SelectItem value="BUILDING">BUILDING</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
                <SelectItem value="DESTROYED">DESTROYED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={`h-7 px-2.5 text-xs ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={`h-7 px-2.5 text-xs ${
              viewMode === 'list'
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListIcon className="h-3.5 w-3.5 mr-1" /> List
          </Button>
        </div>
      </div>

      {/* App List / Grid Display */}
      {filteredApps.length === 0 ? (
        <Card className="p-12 border-dashed border-border text-center flex flex-col items-center justify-center gap-3">
          <Layers className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-base font-bold">No MicroVM Applications Found</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            No applications match your search or filter parameters. Click below to launch a new simulated MicroVM app.
          </p>
          <Button
            onClick={() => setIsDeployModalOpen(true)}
            size="sm"
            className="mt-2 text-xs font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" /> Deploy New MicroVM
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onOpenShare={(app) => setSelectedAppForShare(app)}
              onOpenLogs={(app) => setSelectedAppForLogs(app)}
              onDestroy={handleDestroyApp}
              onRedeploy={handleRedeployApp}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onOpenShare={(app) => setSelectedAppForShare(app)}
              onOpenLogs={(app) => setSelectedAppForLogs(app)}
              onDestroy={handleDestroyApp}
              onRedeploy={handleRedeployApp}
            />
          ))}
        </div>
      )}

      {/* Deploy Simulator Modal */}
      <DeploySimulatorModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploySuccess={handleDeploySuccess}
      />

      {/* Share Management Modal */}
      <ShareModal
        app={selectedAppForShare}
        isOpen={!!selectedAppForShare}
        onClose={() => setSelectedAppForShare(null)}
        shareLinks={selectedAppForShare ? shareLinksMap[selectedAppForShare.id] || [] : []}
        onGenerateShareLink={handleGenerateShareLink}
        onRevokeShareLink={handleRevokeShareLink}
      />

      {/* Live Logs Dialog Popup */}
      <Dialog
        open={!!selectedAppForLogs}
        onOpenChange={(open) => !open && setSelectedAppForLogs(null)}
      >
        <DialogContent className="sm:max-w-[850px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-zinc-900 border-b border-zinc-800">
            <DialogTitle className="text-sm font-mono text-zinc-200">
              Live Container Log Stream — {selectedAppForLogs?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <LogViewer
              appId={selectedAppForLogs?.id}
              appName={selectedAppForLogs?.name}
              height="h-[520px]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
