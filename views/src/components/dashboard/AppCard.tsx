import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Share2,
  MoreVertical,
  Terminal,
  RefreshCw,
  Trash2,
  Copy,
  Check,
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
    toast.success('App URL copied to clipboard');
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
            STOPPED
          </div>
        );
    }
  };

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
              {app.ownerEmail}
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
                  Copy App URL
                </DropdownMenuItem>
                {onOpenLogs && (
                  <DropdownMenuItem onClick={() => onOpenLogs(app)}>
                    <Terminal className="mr-2 h-4 w-4" />
                    App Logs
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
                    Redeploy App
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
                      Delete App
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Domain Row */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-1">
          <div
            onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer font-mono bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40 max-w-[240px] truncate"
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
      </CardContent>

      {/* Footer Info */}
      <div className="px-5 py-2.5 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-[11px]">
          Created {new Date(app.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <div className="flex items-center gap-2">
          {app.shareCount !== undefined && app.shareCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/5 text-primary border-primary/20 px-1.5 py-0 flex items-center gap-1"
            >
              <Share2 className="h-2.5 w-2.5" />
              {app.shareCount} shared
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
