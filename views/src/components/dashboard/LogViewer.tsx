import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  ArrowDownCircle,
  Filter,
  Check,
} from 'lucide-react';
import { LogEntry, LogLevel } from '@/types/app';
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
import { toast } from 'sonner';

interface LogViewerProps {
  appId?: string;
  appName?: string;
  initialLogs?: LogEntry[];
  height?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  appId,
  appName = 'agni-app',
  initialLogs = [],
  height = 'h-[500px]',
}) => {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isStreaming, setIsStreaming] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stream real logs from backend SSE endpoint /api/v1/apps/:id/logs
  useEffect(() => {
    if (!isStreaming || !appId) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/apps/${appId}/logs`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const newEntry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: payload.timestamp || new Date().toISOString(),
            level: 'INFO',
            stream: (payload.stream || 'stdout') as 'stdout' | 'stderr',
            message: payload.line || event.data,
          };
          setLogs((prev) => [...prev.slice(-499), newEntry]);
        } catch {
          const newEntry: LogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            stream: 'stdout',
            message: event.data,
          };
          setLogs((prev) => [...prev.slice(-499), newEntry]);
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // EventSource failed or unsupported
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isStreaming, appId]);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q) ||
        log.stream.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const clearLogs = () => {
    setLogs([]);
    toast.info('Log terminal cleared');
  };

  const downloadLogs = () => {
    const content = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level}] [${l.stream.toUpperCase()}] ${l.message}`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName}-logs-${new Date().toISOString().slice(0, 19)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'INFO':
        return 'text-emerald-400 font-semibold';
      case 'WARN':
        return 'text-amber-400 font-semibold';
      case 'ERROR':
        return 'text-rose-400 font-semibold';
      case 'DEBUG':
        return 'text-sky-400 font-semibold';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Terminal Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-zinc-900/90 border-b border-zinc-800 text-xs">
        {/* Left Status & Search */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-2 mr-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-mono font-bold text-zinc-200">{appName}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border-zinc-700 ${
                isStreaming
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isStreaming ? 'STREAMING' : 'PAUSED'}
            </Badge>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[160px] max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-8 pr-2 text-xs bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500/50"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="w-[110px]">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                <Filter className="h-3 w-3 mr-1 text-zinc-400" />
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                <SelectItem value="ALL">ALL ({logs.length})</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {/* Pause / Stream Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsStreaming(!isStreaming)}
            className="h-7 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800"
          >
            {isStreaming ? (
              <>
                <Pause className="h-3 w-3 mr-1 text-amber-400" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1 text-emerald-400" /> Stream
              </>
            )}
          </Button>

          {/* Auto Scroll Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`h-7 px-2 text-xs border border-zinc-800 ${
              autoScroll
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
            title="Auto-scroll on new output"
          >
            <ArrowDownCircle className="h-3 w-3 mr-1" />
            Auto-Scroll
          </Button>

          {/* Download Logs */}
          <Button
            variant="ghost"
            size="icon"
            onClick={downloadLogs}
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Download Logs"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          {/* Clear Logs */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearLogs}
            className="h-7 w-7 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
            title="Clear Terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={scrollRef}
        className={`${height} overflow-y-auto p-4 font-mono text-[12px] leading-relaxed select-text bg-zinc-950 text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-800`}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 font-sans py-12">
            <Terminal className="h-8 w-8 text-zinc-600 stroke-[1.5]" />
            <p className="text-sm">No log entries matching criteria</p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              className="flex items-start gap-3 py-0.5 hover:bg-zinc-900/60 rounded px-1 group transition-colors"
            >
              {/* Line Number */}
              <span className="w-9 shrink-0 text-right text-zinc-600 select-none text-[11px] group-hover:text-zinc-400">
                {idx + 1}
              </span>

              {/* Timestamp */}
              <span className="shrink-0 text-zinc-500 text-[11px]">
                {log.timestamp.slice(11, 23)}
              </span>

              {/* Level Badge */}
              <span className={`shrink-0 w-12 text-center text-[10px] rounded px-1 py-0.5 font-bold ${
                log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                log.level === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                log.level === 'DEBUG' ? 'bg-sky-500/20 text-sky-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {log.level}
              </span>

              {/* Stream Badge */}
              <span className="shrink-0 text-[10px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                {log.stream}
              </span>

              {/* Log Message */}
              <span className={`break-all ${getLevelColor(log.level)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/60 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
        <span>Showing {filteredLogs.length} / {logs.length} lines</span>
        <span className="flex items-center gap-1 text-zinc-500">
          <Check className="h-3 w-3 text-emerald-400" /> Live log stream connected
        </span>
      </div>
    </div>
  );
};
