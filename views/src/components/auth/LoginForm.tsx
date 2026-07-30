import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  hideCard?: boolean;
}

export function LoginForm({ hideCard = false }: LoginFormProps) {
  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    setUnverifiedEmail(null);
    setResendStatus(null);
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('verify your email') || errMsg.includes('email_not_verified')) {
        setUnverifiedEmail(values.email);
        setError('Your email is not verified yet. Please verify your email before entering.');
      } else {
        setError(errMsg || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendVerification(unverifiedEmail);
      setResendStatus(res.message || 'Verification email resent! Check your inbox.');
    } catch {
      setResendStatus('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {unverifiedEmail && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm space-y-3">
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              Email verification required before accessing the application.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-xl bg-background hover:bg-muted"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending && <Loader2 className="mr-2 size-3 animate-spin" />}
              Resend Verification Email
            </Button>
            {resendStatus && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                {resendStatus}
              </p>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your email"
                  type="email"
                  className="rounded-xl h-11 bg-muted/50 border-border"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="rounded-xl h-11 pr-10 bg-muted/50 border-border"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-11 rounded-xl font-medium shadow-lg shadow-orange-500/25 bg-gradient-to-r from-orange-500 via-amber-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign In with Password
        </Button>
      </form>
    </Form>
  );

  if (hideCard) {
    return formContent;
  }

  return (
    <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-sm border">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold">Sign In</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your email and password</p>
      </div>
      {formContent}
    </div>
  );
}
