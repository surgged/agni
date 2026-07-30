import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    verifyEmail(token).then((ok) => {
      if (!isMounted) return;
      if (ok) {
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-sm border text-center">
        {status === 'loading' && (
          <div className="py-8 space-y-4">
            <Loader2 className="size-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Verifying Email...</h2>
            <p className="text-muted-foreground text-sm">
              Please wait while we confirm your email address.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-4">
            <div className="size-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="text-2xl font-bold">Email Verified!</h2>
            <p className="text-muted-foreground text-sm">
              Your email address has been successfully verified. Entering application...
            </p>
            <Button
              className="mt-4 rounded-xl w-full"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              Continue to Dashboard <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-4">
            <div className="size-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
              <XCircle className="size-10" />
            </div>
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="text-muted-foreground text-sm">
              This verification link is invalid or has expired.
            </p>
            <Button asChild className="mt-4 rounded-xl w-full">
              <Link to="/login">Go to Login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
