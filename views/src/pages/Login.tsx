import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Flame,
  Mail,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  Terminal,
  Laptop,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/ui/Logo';
import { toast } from 'sonner';

export default function Login() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, isLoading, magicLinkLogin, generateAgentToken, demoLogin } = useAuth();
  const navigate = useNavigate();

  // Tab 1 state - Magic Link
  const [email, setEmail] = useState('');
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Tab 2 state - Agent Key
  const [agentName, setAgentName] = useState('agni-mcp-agent-01');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSendingMagicLink(true);
    try {
      await magicLinkLogin(email);
      setMagicLinkSent(true);
      toast.success('Magic link dispatched to your inbox!');
    } catch {
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await generateAgentToken(agentName);
      setGeneratedToken(res.token);
      toast.success('Agent JWT token generated for agni-mcp!');
    } catch {
      toast.error('Failed to generate agent token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getClaudeSnippet = (tokenStr: string) => {
    return JSON.stringify(
      {
        mcpServers: {
          agni: {
            command: 'npx',
            args: ['-y', 'agni-mcp@latest'],
            env: {
              AGNI_AGENT_TOKEN: tokenStr || 'YOUR_AGENT_JWT_TOKEN',
            },
          },
        },
      },
      null,
      2
    );
  };

  const getCursorSnippet = (tokenStr: string) => {
    return JSON.stringify(
      {
        mcpServers: {
          'agni-mcp': {
            url: 'http://localhost:8080/mcp',
            headers: {
              Authorization: `Bearer ${tokenStr || 'YOUR_AGENT_JWT_TOKEN'}`,
            },
          },
        },
      },
      null,
      2
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 md:p-8 bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Theme Switcher in top corner */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-xl border-border/60 bg-card/80 backdrop-blur-sm hover:bg-accent"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {/* Main Container Card (Railway / Vercel Aesthetic) */}
      <div className="w-full max-w-xl z-10 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="lg" showText={false} />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            Agni Cloud Platform
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            High-performance Kata MicroVM orchestrator & agent workspace
          </p>
        </div>

        {/* Card Component */}
        <Card className="border-border/60 shadow-2xl backdrop-blur-md bg-card/90 overflow-hidden">
          <Tabs defaultValue="magic-link" className="w-full">
            <CardHeader className="pb-3 pt-6 px-6 border-b border-border/40 bg-muted/20">
              <TabsList className="grid grid-cols-2 w-full bg-muted/60 p-1 rounded-xl">
                <TabsTrigger
                  value="magic-link"
                  className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
                >
                  <Mail className="size-3.5" />
                  Magic Link Login
                </TabsTrigger>
                <TabsTrigger
                  value="agent-key"
                  className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
                >
                  <KeyRound className="size-3.5" />
                  Agent API Key
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* TAB 1: MAGIC LINK */}
              <TabsContent value="magic-link" className="mt-0 space-y-5">
                {!magicLinkSent ? (
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Work Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="dev@agni.io"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-11 bg-background/60 border-border/60 focus-visible:ring-amber-500"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We'll send a passwordless magic link to verify your identity.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSendingMagicLink}
                      className="w-full h-11 font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/20"
                    >
                      {isSendingMagicLink ? (
                        <div className="flex items-center gap-2">
                          <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Dispatching Link...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Send Magic Link</span>
                          <ArrowRight className="size-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col items-center text-center py-4 space-y-4 animate-in fade-in duration-300">
                    <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold">Check your inbox</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        A authentication link has been sent to <span className="font-semibold text-foreground">{email}</span>.
                      </p>
                    </div>

                    {/* Interactive Demo Triggers */}
                    <div className="w-full pt-3 space-y-2 border-t border-border/40">
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-xs h-9"
                        onClick={() => navigate(`/auth/callback?token=demo_magic_token_${Date.now()}`)}
                      >
                        Simulate Magic Link Click (Callback Flow)
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-xs h-9"
                        onClick={() => {
                          demoLogin();
                          navigate('/');
                        }}
                      >
                        Instant Demo Login
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-foreground h-8"
                        onClick={() => setMagicLinkSent(false)}
                      >
                        Use a different email address
                      </Button>
                    </div>
                  </div>
                )}

                {/* Instant Demo Quick Access Footer */}
                {!magicLinkSent && (
                  <div className="pt-4 border-t border-border/40 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 text-amber-500" />
                        Testing Agni UI offline?
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs font-semibold text-amber-500 hover:text-amber-600 p-0 h-auto"
                        onClick={() => {
                          demoLogin();
                          toast.success('Logged in with instant demo profile!');
                          navigate('/');
                        }}
                      >
                        Launch Demo Session →
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: AGENT API KEY AUTH */}
              <TabsContent value="agent-key" className="mt-0 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="agentName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Agent Identifier
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30">
                        agni-mcp v1.0
                      </Badge>
                    </div>
                    <Input
                      id="agentName"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="agni-mcp-agent-01"
                      className="h-10 bg-background/60 font-mono text-xs border-border/60"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateToken}
                    disabled={isGeneratingToken}
                    variant="outline"
                    className="w-full h-10 text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    {isGeneratingToken ? 'Generating JWT Token...' : '⚡ Generate Agent Token'}
                  </Button>

                  {/* Token & Code Snippets Output */}
                  {generatedToken && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                      {/* Raw JWT Token */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">Agent JWT Token</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 text-amber-500"
                            onClick={() => copyToClipboard(generatedToken, 'Agent JWT Token')}
                          >
                            {copiedField === 'Agent JWT Token' ? (
                              <Check className="size-3 mr-1 text-emerald-500" />
                            ) : (
                              <Copy className="size-3 mr-1" />
                            )}
                            Copy Token
                          </Button>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/60 border border-border/40 font-mono text-[11px] break-all text-muted-foreground select-all max-h-20 overflow-y-auto">
                          {generatedToken}
                        </div>
                      </div>

                      {/* Setup Snippets Tabs */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Terminal className="size-3.5 text-amber-500" />
                          MCP Integration Snippets
                        </Label>

                        <Tabs defaultValue="claude" className="w-full">
                          <TabsList className="grid grid-cols-2 h-8 bg-muted/40 p-0.5 rounded-lg">
                            <TabsTrigger value="claude" className="text-[11px] py-1 rounded-md">
                              claude_desktop_config.json
                            </TabsTrigger>
                            <TabsTrigger value="cursor" className="text-[11px] py-1 rounded-md">
                              cursor.json
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="claude" className="mt-2 relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 text-[10px] px-2 bg-background/80 hover:bg-background text-foreground"
                              onClick={() =>
                                copyToClipboard(getClaudeSnippet(generatedToken), 'Claude Desktop Config')
                              }
                            >
                              {copiedField === 'Claude Desktop Config' ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                            <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                              {getClaudeSnippet(generatedToken)}
                            </pre>
                          </TabsContent>

                          <TabsContent value="cursor" className="mt-2 relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 text-[10px] px-2 bg-background/80 hover:bg-background text-foreground"
                              onClick={() => copyToClipboard(getCursorSnippet(generatedToken), 'Cursor Config')}
                            >
                              {copiedField === 'Cursor Config' ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                            <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                              {getCursorSnippet(generatedToken)}
                            </pre>
                          </TabsContent>
                        </Tabs>
                      </div>

                      {/* Direct Login as Agent button */}
                      <Button
                        className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          demoLogin();
                          toast.success('Authenticated as Agent workspace admin!');
                          navigate('/');
                        }}
                      >
                        <ShieldCheck className="size-3.5 mr-1.5" />
                        Authenticate Dashboard with Agent Session
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <div className="flex items-center gap-1.5">
            <Laptop className="size-3.5 text-amber-500" />
            <span>Agni Engine v0.1.0 • Kata MicroVMs</span>
          </div>
          <a
            href="https://github.com/indralab/agni"
            target="_blank"
            rel="noreferrer"
            className="hover:underline hover:text-foreground"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
}
