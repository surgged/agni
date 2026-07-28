import { HardDrive, FileText, Folder, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const stats = [
  {
    title: 'Total Files',
    value: '1,247',
    icon: FileText,
  },
  {
    title: 'Total Folders',
    value: '34',
    icon: Folder,
  },
  {
    title: 'Recent Uploads',
    value: '12',
    icon: Upload,
  },
  {
    title: 'Storage Used',
    value: '67%',
    icon: HardDrive,
  },
];

const recentFiles = [
  { name: 'Konser Twice.Mp4', type: 'video', size: '700 MB', date: '2 days ago' },
  { name: 'Begitu Syulit Lupa...Mp3', type: 'audio', size: '7 MB', date: '3 days ago' },
  { name: 'project-notes.pdf', type: 'document', size: '2.4 MB', date: '1 week ago' },
  { name: 'Ini Virus.Apk', type: 'application', size: '120 MB', date: '2 weeks ago' },
];

const folderIcons: Record<string, string> = {
  video: '🎬',
  audio: '🎵',
  document: '📄',
  application: '📦',
};

const storageBreakdown = [
  { label: 'Photos', value: 45, color: 'bg-primary/80' },
  { label: 'Videos', value: 30, color: 'bg-primary' },
  { label: 'Documents', value: 10, color: 'bg-rose-300 dark:bg-rose-900' },
  { label: 'Other', value: 15, color: 'bg-muted' },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
        {/* Storage Card */}
        <Card className="overflow-hidden border-0 bg-primary/5">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Available Storage
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold tracking-tight">670 GB</span>
                <span className="text-sm text-muted-foreground font-medium">
                  / 1024 GB
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-6 md:mt-8 font-medium">
                Exp. 07/2025
              </p>
            </div>

            {/* Circular Progress */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0 md:right-auto size-28 md:size-36">
              <svg viewBox="0 0 36 36" className="size-full drop-shadow-sm">
                <path
                  className="fill-none stroke-primary/10 stroke-[3.8]"
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="fill-none stroke-primary stroke-[3.8] stroke-linecap-round"
                  strokeDasharray="67, 100"
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text
                  x="18"
                  y="20.35"
                  className="text-[0.55rem] font-bold fill-foreground"
                  textAnchor="middle"
                >
                  67%
                </text>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <stat.icon className="size-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.title}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Recent Files</h3>
            <Button variant="link" size="sm" className="text-primary">
              See All
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentFiles.map((file) => (
                <TableRow key={file.name} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-primary/5 rounded-xl flex items-center justify-center text-lg">
                        {folderIcons[file.type] || '📄'}
                      </div>
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {file.size}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {file.date}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="size-4"
                          >
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Download</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right Column */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-6">
        {/* Storage Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Storage Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stacked Progress Bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden">
              {storageBreakdown.map((item) => (
                <div
                  key={item.label}
                  className={item.color}
                  style={{ width: `${item.value}%` }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {storageBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`size-3 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.value} GB</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Folders Grid */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {['Design', 'Work', 'Personal'].map((folder) => (
                <Card
                  key={folder}
                  className="bg-primary/5 border-0 hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                    <Folder className="size-10 text-primary" />
                    <span className="text-sm font-medium">{folder}</span>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-2 border-dashed hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-6"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-sm font-medium">New</span>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
