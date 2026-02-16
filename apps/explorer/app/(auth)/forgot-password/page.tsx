'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { forgotPasswordApi } from '@/lib/api/auth';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await forgotPasswordApi(data.email);
      setIsSuccess(true);
    } catch {
      // Always show success to prevent user enumeration
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Panel title="Check your email">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-accent">Check your email</h2>
          <p className="text-xs font-mono text-tui-dim">
            We&apos;ve sent a password reset link to your email address.
            If you don&apos;t see it, check your spam folder. The link expires in 1 hour.
          </p>
          <Link href="/login" className="text-xs font-mono text-tui-cyan no-underline hover:underline">
            Back to sign in
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Forgot Password">
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-base font-mono text-tui-accent">Forgot password?</h2>
          <p className="text-xs font-mono text-tui-dim">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {error && (
            <div className="border border-tui-red bg-tui-red/10 px-3 py-2">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset link'}
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
