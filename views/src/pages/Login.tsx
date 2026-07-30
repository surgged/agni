import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/ui/Logo';
import { LoginForm } from '@/components/auth/LoginForm';
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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Panel - Brand / Marketing */}
      <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-muted/50 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-md relative z-10">
          <div className="mb-8">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Agni
            </span>
          </h1>
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
            High-performance Kata MicroVM orchestrator and agent workspace.
            Sign in to manage your secure micro-sandboxes and deploy apps instantly.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <Terminal className="size-5 text-orange-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">MCP Agent Integration</span>
                <p className="text-xs text-muted-foreground">Connect AI assistants directly via Model Context Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">Hardware-Isolated Sandboxes</span>
                <p className="text-xs text-muted-foreground">Kata MicroVM security with 420ms cold boot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <Sparkles className="size-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">Instant Deployment</span>
                <p className="text-xs text-muted-foreground">Sub-second app launches with shareable HTTPS links</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Mobile Brand Header */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <Logo size="lg" showText={false} />
          <h1 className="text-2xl font-extrabold mt-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Agni Cloud Platform
          </h1>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <Card className="rounded-3xl shadow-sm border border-border overflow-hidden">
            <Tabs defaultValue="password" className="w-full">
              <CardHeader className="pb-2 pt-5 px-5 border-b border-border/40 bg-muted/20">
                <div className="text-center mb-3">
                  <h2 className="text-xl font-bold">Sign In</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter your email and password to access your account
                  </p>
                </div>
                {/* 
                <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger
                    value="password"
                    className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Lock className="size-3.5" />
                    Password
                  </TabsTrigger>
                  <TabsTrigger
                    value="magic-link"
                    className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Mail className="size-3.5" />
                    Magic Link
                  </TabsTrigger>
                  <TabsTrigger
                    value="agent-key"
                    className="rounded-lg text-xs font-semibold py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="size-3.5" />
                    Agent Key
                  </TabsTrigger>
                </TabsList>
                */}
              </CardHeader>

              <CardContent className="p-5">
                {/* TAB 1: PASSWORD LOGIN */}
                <TabsContent value="password" className="mt-0 space-y-4">
                  <LoginForm hideCard />
                </TabsContent>

                {/* 
                TAB 2: MAGIC LINK (COMMENTED OUT)
                <TabsContent value="magic-link" className="mt-0 space-y-5">
                  {!magicLinkSent ? (
                    <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="dev@agni.io"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9 rounded-xl h-11 bg-muted/50 border-border"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We&apos;ll send a passwordless magic link to verify your identity.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSendingMagicLink}
                        className="w-full rounded-xl h-11 font-medium shadow-lg shadow-orange-500/25 bg-gradient-to-r from-orange-500 via-amber-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                      >
                        {isSendingMagicLink ? (
                          <div className="flex items-center gap-2">
                            <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Sending link...</span>
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
                        <p className="text-sm text-muted-foreground max-w-xs">
                          An authentication link has been sent to{' '}
                          <span className="font-semibold text-foreground">{email}</span>.
                        </p>
                      </div>

                      <div className="w-full pt-3 space-y-2 border-t border-border">
                        <Button
                          variant="default"
                          className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-amber-600 to-amber-600 text-white font-medium text-xs h-9 shadow-lg shadow-orange-500/25"
                          onClick={() => navigate(`/auth/callback?token=demo_magic_token_${Date.now()}`)}
                        >
                          Simulate Magic Link Click
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl text-xs h-9"
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

                  {!magicLinkSent && (
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3 text-orange-500" />
                        Testing Agni UI offline?
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600 p-0 h-auto"
                        onClick={() => {
                          demoLogin();
                          toast.success('Logged in with instant demo profile!');
                          navigate('/');
                        }}
                      >
                        Launch Demo Session →
                      </Button>
                    </div>
                  )}
                </TabsContent>
                */}

                {/* 
                TAB 3: AGENT API KEY AUTH (COMMENTED OUT)
                <TabsContent value="agent-key" className="mt-0 space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="agentName" className="text-sm font-medium">
                          Agent Identifier
                        </label>
                        <Badge variant="outline" className="text-[10px] font-mono text-orange-500 border-orange-500/30">
                          agni-mcp v1.0
                        </Badge>
                      </div>
                      <Input
                        id="agentName"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="agni-mcp-agent-01"
                        className="rounded-xl h-10 bg-muted/50 font-mono text-xs border-border"
                      />
                    </div>

                    <Button
                      onClick={handleGenerateToken}
                      disabled={isGeneratingToken}
                      variant="outline"
                      className="w-full rounded-xl h-10 text-sm font-medium border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                    >
                      {isGeneratingToken ? 'Generating JWT Token...' : '⚡ Generate Agent Token'}
                    </Button>

                    {generatedToken && (
                      <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Agent JWT Token</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2 text-orange-500"
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
                          <div className="p-2.5 rounded-xl bg-muted/60 border border-border font-mono text-[11px] break-all text-muted-foreground select-all max-h-20 overflow-y-auto">
                            {generatedToken}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Terminal className="size-3.5 text-orange-500" />
                            MCP Integration Snippets
                          </span>

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
                              <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
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
                              <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                                {getCursorSnippet(generatedToken)}
                              </pre>
                            </TabsContent>
                          </Tabs>
                        </div>

                        <Button
                          className="w-full rounded-xl h-9 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
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
                */}
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-6 w-full max-w-md px-2">
          <div className="flex items-center gap-1.5">
            <Laptop className="size-3.5 text-orange-500" />
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

        {/* Register link */}
        <p className="mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-orange-500 hover:text-orange-600 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
