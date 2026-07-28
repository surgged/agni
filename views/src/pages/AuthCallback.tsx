import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyMagicToken } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const token = searchParams.get('token') || 'demo_magic_link_token_123';

    async function handleVerify() {
      try {
        // Simulated small delay for crisp UI feedback animation
        await new Promise((res) => setTimeout(res, 900));
        const ok = await verifyMagicToken(token);
        if (isMounted) {
          if (ok) {
            setStatus('success');
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          } else {
            setStatus('error');
            setErrorMessage('Invalid or expired authentication link.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to verify authentication token.'
          );
        }
      }
    }

    handleVerify();

    return () => {
      isMounted = false;
    };
  }, [searchParams, verifyMagicToken, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-background via-muted/30 to-background p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-gradient-to-tr from-orange-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-border/60 shadow-2xl backdrop-blur-sm bg-card/95">
        <CardContent className="p-8 flex flex-col items-center text-center">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="size-6 text-white animate-pulse" />
            </div>
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Agni
            </span>
          </div>

          {status === 'verifying' && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="relative">
                <div className="size-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                <Flame className="size-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">Verifying Magic Link...</h3>
                <p className="text-sm text-muted-foreground">
                  Validating security token with Agni Kata MicroVM Node...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight text-emerald-500">
                  Authentication Successful!
                </h3>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4 space-y-4 animate-in fade-in duration-300">
              <div className="size-16 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                <XCircle className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight text-destructive">
                  Verification Failed
                </h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || 'The authentication token could not be verified.'}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-2 font-medium"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
