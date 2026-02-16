'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { FormCheckbox } from '@/components/ui/form-checkbox';
import { Button } from '@/components/ui/button';
import { OAuthButtons } from './oauth-buttons';
import { useAuthStore } from '@/lib/stores/auth-store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuthStore();
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
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    const result = await login({ email: data.email, password: data.password }, data.rememberMe);
    if (result.ok) {
      router.push(redirectTo);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <Panel title="Login">
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-base font-mono text-tui-accent">Welcome back</h2>
          <p className="text-xs font-mono text-tui-dim">Sign in to your account to continue</p>
        </div>

        <OAuthButtons disabled={isLoading} />

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-tui-border" />
          <span className="text-xs font-mono text-tui-dim whitespace-nowrap">or continue with</span>
          <div className="flex-1 border-t border-tui-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-1">
          {error && (
            <div className="mb-2 border border-tui-red bg-tui-red/10 px-3 py-2">
              <p className="text-xs font-mono text-tui-red">{error}</p>
            </div>
          )}

          <FormInput
            label="Email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-mono text-tui-dim">Password</span>
              <Link href="/forgot-password" className="text-xs font-mono text-tui-cyan no-underline hover:underline">
                Forgot password?
              </Link>
            </div>
            <FormInput
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className="mb-2">
            <FormCheckbox
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setValue('rememberMe', (e.target as HTMLInputElement).checked)}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : '$ login'}
          </Button>
        </form>

        <p className="text-center text-xs font-mono text-tui-dim">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-tui-cyan no-underline hover:underline">Sign up</Link>
        </p>
      </div>
    </Panel>
  );
}
