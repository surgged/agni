import { useState } from 'react';
import { Search, Upload, MoreHorizontal, FileText, File, Image, Video, Music, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const allFiles = [
  { name: 'Konser Twice.Mp4', type: 'video', size: '700 MB', modified: '2 days ago' },
  { name: 'Begitu Syulit Lupa...Mp3', type: 'audio', size: '7 MB', modified: '3 days ago' },
  { name: 'project-notes.pdf', type: 'document', size: '2.4 MB', modified: '1 week ago' },
  { name: 'hero-banner.png', type: 'image', size: '4.2 MB', modified: '1 week ago' },
  { name: 'Ini Virus.Apk', type: 'archive', size: '120 MB', modified: '2 weeks ago' },
  { name: 'sprint-retro.pptx', type: 'document', size: '8.1 MB', modified: '2 weeks ago' },
  { name: 'cat-meme.gif', type: 'image', size: '1.1 MB', modified: '3 weeks ago' },
  { name: 'backup-db.sql.zip', type: 'archive', size: '45 MB', modified: '1 month ago' },
];

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  audio: Music,
  document: FileText,
  image: Image,
  archive: Archive,
};

const typeColor: Record<string, string> = {
  video: 'text-rose-500 bg-rose-500/10',
  audio: 'text-purple-500 bg-purple-500/10',
  document: 'text-blue-500 bg-blue-500/10',
  image: 'text-emerald-500 bg-emerald-500/10',
  archive: 'text-amber-500 bg-amber-500/10',
};

export default function Files() {
  const [search, setSearch] = useState('');

  const filtered = allFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Files</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all your uploaded files and documents.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/30">
          <Upload className="size-4" />
          Upload
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9 rounded-xl bg-muted/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="h-9 px-3 font-normal">
          {filtered.length} files
        </Badge>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Modified</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((file) => {
              const Icon = typeIcons[file.type] || File;
              return (
                <TableRow key={file.name} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center ${typeColor[file.type] || 'text-muted-foreground bg-muted'}`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="font-medium text-sm truncate max-w-[280px]">
                        {file.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {file.size}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">
                    {file.type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {file.modified}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Download</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem>Rename</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No files found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
