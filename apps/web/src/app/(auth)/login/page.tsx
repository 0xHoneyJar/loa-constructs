/**
 * Login Page (TUI Style)
 * @see sprint.md T20.3: Redesign Authentication Pages
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiInput, TuiCheckbox } from '@/components/tui/tui-input';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim, TuiError, TuiDivider } from '@/components/tui/tui-text';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password, data.rememberMe);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/v1/auth/${provider}`;
  };

  return (
    <TuiBox title="Login">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <TuiH2>Welcome back</TuiH2>
          <TuiDim>Sign in to your account to continue</TuiDim>
        </div>

        {/* OAuth Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <TuiButton
            variant="secondary"
            fullWidth
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuthLogin('github')}
          >
            GitHub
          </TuiButton>
          <TuiButton
            variant="secondary"
            fullWidth
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuthLogin('google')}
          >
            Google
          </TuiButton>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TuiDivider length={15} />
          <TuiDim style={{ whiteSpace: 'nowrap' }}>or continue with</TuiDim>
          <TuiDivider length={15} />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--red)',
                background: 'rgba(255, 95, 95, 0.1)',
                marginBottom: '8px',
              }}
            >
              <TuiError>{error}</TuiError>
            </div>
          )}

          <TuiInput
            label="Email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--fg-dim)', fontSize: '12px' }}>Password</span>
              <Link
                href="/forgot-password"
                style={{ color: 'var(--cyan)', fontSize: '12px', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>
            <TuiInput
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <TuiCheckbox
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setValue('rememberMe', (e.target as HTMLInputElement).checked)}
              disabled={isLoading}
            />
          </div>

          <TuiButton type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Signing in...' : '$ login'}
          </TuiButton>
        </form>

        <div style={{ textAlign: 'center' }}>
          <TuiDim>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
              Sign up
            </Link>
          </TuiDim>
        </div>
      </div>
    </TuiBox>
  );
}
