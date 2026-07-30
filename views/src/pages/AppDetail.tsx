import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Share2,
  Cpu,
  HardDrive,
  Activity,
  ShieldCheck,
  Settings,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Server,
  Globe,
  Key,
  AlertTriangle,
  Mail,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { App, ShareLink, AppStatus, SharePermission } from '@/types/app';
import { api, mapBackendAppToApp, mapBackendShareToShareLink } from '@/api';
import { LogViewer } from '@/components/dashboard/LogViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<App | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Env Vars State
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});

  // Share form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('use');
  const [expiryOption, setExpiryOption] = useState('168');
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      api.getApp(id).then(mapBackendAppToApp).catch(() => null),
      api.getAppShares(id).then((shares) => shares.map(mapBackendShareToShareLink)).catch(() => []),
    ])
      .then(([fetchedApp, fetchedShares]) => {
        setApp(fetchedApp);
        if (fetchedApp) {
          setEnvVars(fetchedApp.envVars || {});
        }
        setShareLinks(fetchedShares);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Server className="h-10 w-10 text-muted-foreground mb-2" />
        <h2 className="text-lg font-bold">App Not Found</h2>
        <p className="text-xs text-muted-foreground mb-4">
          The requested MicroVM application does not exist.
        </p>
        <Button size="sm" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const copyServiceUrl = () => {
    navigator.clipboard.writeText(app.serviceUrl);
    setCopiedUrl(true);
    toast.success('Domain URL copied to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Env Vars Handlers
  const handleAddEnvVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) {
      toast.error('Key is required');
      return;
    }
    const cleanKey = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    setEnvVars((prev) => ({ ...prev, [cleanKey]: newValue }));
    setNewKey('');
    setNewValue('');
    toast.success(`Environment variable ${cleanKey} added`);
  };

  const handleDeleteEnvVar = (key: string) => {
    setEnvVars((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    toast.info(`Removed ${key}`);
  };

  // Share Link Handlers
  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Valid email address required');
      return;
    }

    try {
      const res = await api.createAppShare(app.id, recipientEmail, permission);
      const newShare = mapBackendShareToShareLink(res);
      setShareLinks((prev) => [newShare, ...prev]);
      setCreatedShareUrl(`https://agni.dev/share/${newShare.tokenHash}`);
      setRecipientEmail('');
      toast.success(`Share link generated for ${recipientEmail}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate share link');
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!app) return;
    try {
      await api.revokeAppShare(app.id, linkId);
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
      toast.info('Share link revoked');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke link');
    }
  };

  // App Destroy Handler
  const handleDestroyApp = async () => {
    if (!app) return;
    try {
      await api.deleteApp(app.id);
      toast.success(`Application ${app.name} destroyed successfully`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to destroy application');
    }
  };

  const getStatusPill = () => {
    switch (app.status) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </div>
        );
      case 'BUILDING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            BUILDING
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            FAILED
          </div>
        );
      case 'DESTROYED':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
            DESTROYED
          </div>
        );
    }
  };

  const activeShareLinks = shareLinks.filter((l) => !l.revokedAt);
  const memPercent = Math.min(
    100,
    Math.round((app.metrics.memoryMB / (app.metrics.memoryLimitMB || 1)) * 100)
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground font-mono">{app.name}</span>
      </div>

      {/* Main Header Banner */}
      <Card className="bg-card/70 border-border/70 backdrop-blur-md">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {app.name}
              </h1>
              {getStatusPill()}
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border border-border/50 text-xs px-2.5 py-0.5 flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {app.runtime}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
              <span>Image: {app.imageRef}</span>
              <span>•</span>
              <span>Pod: {app.podName}</span>
              <span>•</span>
              <span>Owner: {app.ownerEmail}</span>
            </div>
          </div>

          {/* Service URL & Quick CTA */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={copyServiceUrl}
              className="h-9 text-xs font-mono border-border/60 bg-muted/30"
            >
              {copiedUrl ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 mr-1.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              {app.serviceUrl.replace(/^https?:\/\//, '')}
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(app.serviceUrl, '_blank')}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              Visit App <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/40 border border-border/50 p-1 h-10">
          <TabsTrigger value="overview" className="text-xs font-medium gap-1.5">
            <Activity className="h-3.5 w-3.5 text-blue-400" /> Overview
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-medium gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Live Logs
          </TabsTrigger>
          <TabsTrigger value="share" className="text-xs font-medium gap-1.5">
            <Share2 className="h-3.5 w-3.5 text-purple-400" /> Share Links ({activeShareLinks.length})
          </TabsTrigger>
          <TabsTrigger value="env" className="text-xs font-medium gap-1.5">
            <Key className="h-3.5 w-3.5 text-amber-400" /> Environment
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs font-medium gap-1.5">
            <Settings className="h-3.5 w-3.5 text-rose-400" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview Metrics & Pod Info */}
        <TabsContent value="overview" className="flex flex-col gap-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CPU Metric Card */}
            <Card className="bg-card/50 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>CPU Utilization</span>
                  <Cpu className="h-4 w-4 text-blue-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono">
                    {app.status === 'LIVE' ? `${app.metrics.cpuPercent}%` : '0%'}
                  </span>
                  <span className="text-xs text-muted-foreground">1 vCPU core</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: app.status === 'LIVE' ? `${app.metrics.cpuPercent}%` : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Memory Metric Card */}
            <Card className="bg-card/50 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Memory Usage</span>
                  <HardDrive className="h-4 w-4 text-purple-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono">
                    {app.status === 'LIVE' ? `${app.metrics.memoryMB} MB` : '0 MB'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Limit: {app.metrics.memoryLimitMB} MB
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      memPercent > 85 ? 'bg-rose-500' : 'bg-purple-500'
                    }`}
                    style={{ width: app.status === 'LIVE' ? `${memPercent}%` : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Throughput Metric Card */}
            <Card className="bg-card/50 border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Request Rate</span>
                  <Activity className="h-4 w-4 text-emerald-400" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono">
                    {app.status === 'LIVE' ? app.metrics.requestsPerSec : 0}
                  </span>
                  <span className="text-xs text-muted-foreground">req / sec</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-emerald-400 font-bold flex items-center">
                    ↑ {app.metrics.networkTxKbps || 340} Kbps
                  </span>
                  <span>/</span>
                  <span className="text-blue-400 font-bold flex items-center">
                    ↓ {app.metrics.networkRxKbps || 120} Kbps
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MicroVM Pod Technical Specifications */}
          <Card className="bg-card/50 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" /> MicroVM Specification & Pod Metadata
              </CardTitle>
              <CardDescription className="text-xs">
                Low-level Firecracker MicroVM jailer state and Linux kernel guest details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium">Pod Name</span>
                  <p className="font-mono font-bold text-foreground">{app.podName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium">Hypervisor Engine</span>
                  <p className="font-mono font-bold text-foreground">Kata + Firecracker v1.6.0</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium">Guest Kernel</span>
                  <p className="font-mono font-bold text-foreground">vmlinux-5.15.0-kata</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-muted-foreground font-medium">Pod IP Address</span>
                  <p className="font-mono font-bold text-foreground">172.19.0.4 / virtio-net</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Live Logs */}
        <TabsContent value="logs" className="pt-4">
          <LogViewer appId={app.id} appName={app.name} height="h-[560px]" />
        </TabsContent>

        {/* Tab 3: Share Management */}
        <TabsContent value="share" className="flex flex-col gap-6 pt-4">
          <Card className="bg-card/50 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Generate Share Access Link
              </CardTitle>
              <CardDescription className="text-xs">
                Share read-only or administrative access to this MicroVM app using scoped magic tokens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateShareLink} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <Label className="text-xs font-semibold">Recipient Email</Label>
                    <Input
                      type="email"
                      placeholder="teammate@company.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Permission */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Permission Level</Label>
                    <Select
                      value={permission}
                      onValueChange={(v) => setPermission(v as SharePermission)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="use">use (Execute & View)</SelectItem>
                        <SelectItem value="admin">admin (Manage & Edit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expiration */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Expiration Duration</Label>
                    <Select value={expiryOption} onValueChange={setExpiryOption}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Expiry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                        <SelectItem value="168">7 Days</SelectItem>
                        <SelectItem value="720">30 Days</SelectItem>
                        <SelectItem value="never">Never (Persistent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" size="sm" className="w-fit h-9 text-xs font-semibold">
                  <Plus className="h-4 w-4 mr-1.5" /> Create Magic Share Token
                </Button>
              </form>

              {createdShareUrl && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
                  <span className="font-mono text-emerald-400 truncate">{createdShareUrl}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(createdShareUrl);
                      toast.success('Share link copied');
                    }}
                    className="h-7 text-xs"
                  >
                    Copy Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Links Table */}
          <Card className="bg-card/50 border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground">
                Active & Revoked Share Tokens ({shareLinks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shareLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No share links generated yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {shareLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs gap-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{link.recipientEmail}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {link.permission}
                          </Badge>
                          {link.revokedAt && (
                            <Badge variant="destructive" className="text-[10px] px-1.5">
                              Revoked
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Token: {link.tokenHash} • Expires:{' '}
                          {link.expiresAt
                            ? new Date(link.expiresAt).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>

                      {!link.revokedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeLink(link.id)}
                          className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Environment Variables */}
        <TabsContent value="env" className="flex flex-col gap-6 pt-4">
          <Card className="bg-card/50 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" /> MicroVM Environment Variables
              </CardTitle>
              <CardDescription className="text-xs">
                Injected into the Kata MicroVM container sandbox at initialization time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Env Form */}
              <form onSubmit={handleAddEnvVar} className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                  <Label className="text-xs font-semibold">Key</Label>
                  <Input
                    placeholder="KEY_NAME"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                  <Label className="text-xs font-semibold">Value</Label>
                  <Input
                    placeholder="value_string"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                  <Plus className="h-4 w-4 mr-1" /> Add Variable
                </Button>
              </form>

              {/* List Env Vars */}
              <div className="flex flex-col gap-2 pt-2">
                {Object.keys(envVars).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No environment variables defined.
                  </p>
                ) : (
                  Object.entries(envVars).map(([key, val]) => {
                    const isVisible = showEnvValues[key] || false;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 font-mono text-xs gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-bold text-amber-400 shrink-0">{key}</span>
                          <span className="text-muted-foreground">=</span>
                          <span className="text-foreground truncate">
                            {isVisible ? val : '••••••••••••••••'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setShowEnvValues((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            {isVisible ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                            onClick={() => handleDeleteEnvVar(key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Settings & Danger Zone */}
        <TabsContent value="settings" className="flex flex-col gap-6 pt-4">
          {/* General Config */}
          <Card className="bg-card/50 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold">App Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Custom Domain Service URL</Label>
                <Input defaultValue={app.serviceUrl} readOnly className="h-9 font-mono" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Memory Limit Allocation (MB)</Label>
                <Input defaultValue={app.metrics.memoryLimitMB} readOnly className="h-9 font-mono" />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardHeader>
              <CardTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
              <CardDescription className="text-xs text-rose-300/80">
                Permanently destroy this Kata MicroVM container and release all allocated resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-9 text-xs font-semibold">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Destroy Application
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold text-destructive">
                      Destroy {app.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      This action will terminate the Firecracker hypervisor process, unmount all sandbox volumes, and remove the app routing domain permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDestroyApp}
                      className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                    >
                      Confirm Destroy
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
