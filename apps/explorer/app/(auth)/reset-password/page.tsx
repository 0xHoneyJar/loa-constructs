'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { resetPasswordApi } from '@/lib/api/auth';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await resetPasswordApi({ token, password: data.password });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Panel title="Invalid link">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-accent">Invalid link</h2>
          <p className="text-xs font-mono text-tui-dim">This password reset link is invalid or has expired.</p>
          <Link href="/forgot-password">
            <Button>Request new link</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  if (isSuccess) {
    return (
      <Panel title="Success">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-green">Password reset successful</h2>
          <p className="text-xs font-mono text-tui-dim">You can now sign in with your new password.</p>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Reset Password">
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-base font-mono text-tui-accent">Reset password</h2>
          <p className="text-xs font-mono text-tui-dim">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {error && (
            <div className="border border-tui-red bg-tui-red/10 px-3 py-2">
              <p className="text-xs font-mono text-tui-red">{error}</p>
            </div>
          )}

          <FormInput
            label="New Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.password?.message}
            hint="Min 8 chars with uppercase, lowercase, and number"
            {...register('password')}
          />

          <FormInput
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>

        <p className="text-center text-xs font-mono text-tui-dim">
          Remember your password?{' '}
          <Link href="/login" className="text-tui-cyan no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </Panel>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-tui-dim font-mono text-sm">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
