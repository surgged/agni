import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  Server,
  Filter,
} from 'lucide-react';
import { App, ShareLink } from '@/types/app';
import { api, mapBackendAppToApp, mapBackendShareToShareLink, ClusterHealthResponse } from '@/api';
import { AppCard } from '@/components/dashboard/AppCard';
import { DeploySimulatorModal } from '@/components/dashboard/DeploySimulatorModal';
import { ShareModal } from '@/components/dashboard/ShareModal';
import { LogViewer } from '@/components/dashboard/LogViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          app.podName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [apps, statusFilter, searchQuery]);

  const liveAppsCount = useMemo(() => {
    return apps.filter((a) => a.status === 'LIVE' || a.status === 'BUILDING').length;
  }, [apps]);

  const handleDeploySuccess = (newApp: App) => {
    setApps((prev) => [newApp, ...prev]);
    loadData();
  };

  const handleDestroyApp = async (appToDestroy: App) => {
    try {
      await api.deleteApp(appToDestroy.id);
      setApps((prev) => prev.filter((a) => a.id !== appToDestroy.id));
      toast.success(`App ${appToDestroy.name} deleted`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to delete ${appToDestroy.name}`);
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
          <h1 className="text-2xl font-extrabold tracking-tight">Agni Applications</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your deployed applications, share access, and monitor status.
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
            <Plus className="h-4 w-4" /> New Deployment
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Active Applications
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold tracking-tight">
                  {liveAppsCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {apps.length} Total Apps
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
              placeholder="Search apps by name..."
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
              <SelectItem value="DESTROYED">Stopped</SelectItem>
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

      {/* Main Apps Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="p-12 text-center bg-card/20 border-dashed border-2 border-border/60">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No Deployed Applications</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {apps.length === 0
                ? 'You do not have any deployed applications yet. Click below to deploy your first app.'
                : 'No applications match your current search query or status filter.'}
            </p>
            {apps.length === 0 && (
              <Button onClick={() => setIsDeployModalOpen(true)} className="gap-2 text-xs">
                <Plus className="h-4 w-4" /> Deploy Application
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

      {/* Deploy App Modal */}
      <DeploySimulatorModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploySuccess={handleDeploySuccess}
      />

      {/* Share Link Modal */}
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
              Application Logs: {selectedAppForLogs?.name}
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
