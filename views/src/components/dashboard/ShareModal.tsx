import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Shield,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { App, ShareLink, SharePermission } from '@/types/app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ShareModalProps {
  app: App | null;
  isOpen: boolean;
  onClose: () => void;
  shareLinks?: ShareLink[];
  onGenerateShareLink?: (
    appId: string,
    recipientEmail: string,
    permission: SharePermission,
    expirationHours: number | null
  ) => void;
  onRevokeShareLink?: (linkId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  app,
  isOpen,
  onClose,
  shareLinks = [],
  onGenerateShareLink,
  onRevokeShareLink,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('use');
  const [expiryOption, setExpiryOption] = useState<string>('168'); // default 7 days (168h)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!app) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }

    const expHours = expiryOption === 'never' ? null : parseInt(expiryOption, 10);
    const tokenHash = `tok_${Math.random().toString(36).substring(2, 10)}`;
    const newShareUrl = `https://agni.dev/share/${tokenHash}?app=${app.id}`;

    if (onGenerateShareLink) {
      onGenerateShareLink(app.id, recipientEmail, permission, expHours);
    }

    setCreatedUrl(newShareUrl);
    toast.success(`Share link generated for ${recipientEmail}`);
    setRecipientEmail('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeLinks = shareLinks.filter((link) => !link.revokedAt);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Share Management — {app.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Generate secure tokenized access links and manage permissions for this application.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* Create New Link Form */}
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" /> Create New Share Link
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {app.runtime}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Recipient Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="collaborator@company.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Options row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Permission */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Permission
                  </Label>
                  <Select
                    value={permission}
                    onValueChange={(v) => setPermission(v as SharePermission)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="use">use (View & Invoke)</SelectItem>
                      <SelectItem value="admin">admin (Full Control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiration */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Expiration
                  </Label>
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
            </div>

            <Button type="submit" size="sm" className="w-full h-9 mt-1 text-xs font-medium">
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> Generate Magic Link
            </Button>
          </form>

          {/* Newly Created Link Highlight */}
          {createdUrl && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col gap-2">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="h-4 w-4" /> Share Link Created
              </span>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdUrl}
                  className="h-8 text-xs font-mono bg-background text-foreground"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(createdUrl, 'new-link')}
                  className="h-8 px-3 shrink-0"
                >
                  {copiedId === 'new-link' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Active Links List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Share Links ({activeLinks.length})
              </h4>
            </div>

            {activeLinks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No active share links. Create one using the form above.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                {activeLinks.map((link) => {
                  const shareUrl = `https://agni.dev/share/${link.tokenHash}`;
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs gap-3"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {link.recipientEmail}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                              link.permission === 'admin'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {link.permission}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="font-mono">{link.tokenHash}</span>
                          <span>•</span>
                          <span>
                            {link.expiresAt
                              ? `Expires: ${new Date(link.expiresAt).toLocaleDateString()}`
                              : 'No Expiry'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(shareUrl, link.id)}
                          title="Copy Share Link"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                          onClick={() => {
                            if (onRevokeShareLink) {
                              onRevokeShareLink(link.id);
                            }
                            toast.info(`Revoked share link for ${link.recipientEmail}`);
                          }}
                          title="Revoke Link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
