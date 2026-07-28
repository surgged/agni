import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Cpu,
  HardDrive,
  Share2,
  MoreVertical,
  Terminal,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { App } from '@/types/app';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface AppCardProps {
  app: App;
  onOpenShare?: (app: App) => void;
  onOpenLogs?: (app: App) => void;
  onDestroy?: (app: App) => void;
  onRedeploy?: (app: App) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  onOpenShare,
  onOpenLogs,
  onDestroy,
  onRedeploy,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(app.serviceUrl);
    setCopied(true);
    toast.success('Service URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusPill = () => {
    switch (app.status) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </div>
        );
      case 'BUILDING':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            BUILDING
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            FAILED
          </div>
        );
      case 'DESTROYED':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
            DESTROYED
          </div>
        );
    }
  };

  const getRuntimeLabel = (runtime: string) => {
    if (runtime === 'kata-fc') return 'kata-fc / Firecracker';
    if (runtime === 'firecracker') return 'Firecracker MicroVM';
    if (runtime === 'gvisor') return 'gVisor Sandbox';
    return runtime;
  };

  const memPercent = Math.min(
    100,
    Math.round((app.metrics.memoryMB / (app.metrics.memoryLimitMB || 1)) * 100)
  );

  return (
    <Card
      onClick={() => navigate(`/app/${app.id}`)}
      className="group relative border border-border/60 hover:border-primary/50 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      {/* Top Bar Header */}
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/app/${app.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-base hover:text-primary transition-colors truncate tracking-tight text-foreground"
              >
                {app.name}
              </Link>
              {getStatusPill()}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {app.imageRef}
            </p>
          </div>

          {/* Action Menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/app/${app.id}`)}>
                  <Terminal className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Domain
                </DropdownMenuItem>
                {onOpenLogs && (
                  <DropdownMenuItem onClick={() => onOpenLogs(app)}>
                    <Terminal className="mr-2 h-4 w-4" />
                    Live Logs
                  </DropdownMenuItem>
                )}
                {onOpenShare && (
                  <DropdownMenuItem onClick={() => onOpenShare(app)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Links ({app.shareCount || 0})
                  </DropdownMenuItem>
                )}
                {onRedeploy && (
                  <DropdownMenuItem onClick={() => onRedeploy(app)}>
                    <RefreshCw className="mr-2 h-4 w-4 text-amber-400" />
                    Trigger Redeploy
                  </DropdownMenuItem>
                )}
                {onDestroy && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDestroy(app)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Destroy App
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Runtime and Domain Row */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-1">
          <Badge
            variant="secondary"
            className="bg-muted/80 text-muted-foreground border border-border/50 font-mono text-[11px] px-2 py-0.5 flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3 w-3 text-primary" />
            {getRuntimeLabel(app.runtime)}
          </Badge>

          <div
            onClick={copyUrl}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer font-mono bg-muted/30 px-2 py-0.5 rounded border border-border/40 max-w-[200px] truncate"
            title={app.serviceUrl}
          >
            <span className="truncate">{app.serviceUrl.replace(/^https?:\/\//, '')}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
            ) : (
              <ExternalLink className="h-3 w-3 shrink-0" />
            )}
          </div>
        </div>

        {/* Metrics Micro Bars */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* CPU Bar */}
          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Cpu className="h-3 w-3 text-blue-400" /> CPU
              </span>
              <span className="font-mono font-semibold text-foreground">
                {app.status === 'LIVE' ? `${app.metrics.cpuPercent}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  app.metrics.cpuPercent > 80
                    ? 'bg-rose-500'
                    : app.metrics.cpuPercent > 50
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{
                  width: app.status === 'LIVE' ? `${Math.min(100, app.metrics.cpuPercent)}%` : '0%',
                }}
              />
            </div>
          </div>

          {/* Memory Bar */}
          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <HardDrive className="h-3 w-3 text-purple-400" /> RAM
              </span>
              <span className="font-mono font-semibold text-foreground truncate">
                {app.status === 'LIVE'
                  ? `${app.metrics.memoryMB} / ${app.metrics.memoryLimitMB}MB`
                  : '0 MB'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  memPercent > 85 ? 'bg-rose-500' : 'bg-purple-500'
                }`}
                style={{ width: app.status === 'LIVE' ? `${memPercent}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Footer Info */}
      <div className="px-5 py-2.5 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-mono text-[11px]">
          {app.podName || 'pod-unassigned'}
        </span>
        <div className="flex items-center gap-2">
          {app.shareCount !== undefined && app.shareCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/5 text-primary border-primary/20 px-1.5 py-0 flex items-center gap-1"
            >
              <Share2 className="h-2.5 w-2.5" />
              {app.shareCount} active
            </Badge>
          )}
          <span className="text-[11px]">
            {new Date(app.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </Card>
  );
};
