'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { FormCheckbox } from '@/components/ui/form-checkbox';
import { Button } from '@/components/ui/button';
import { OAuthButtons } from './oauth-buttons';
import { useAuthStore } from '@/lib/stores/auth-store';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, { message: 'You must accept the terms' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    const result = await registerUser({ email: data.email, password: data.password, name: data.name });
    if (result.ok) {
      router.push('/verify-email?email=' + encodeURIComponent(data.email));
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <Panel title="Register">
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-base font-mono text-tui-accent">Create an account</h2>
          <p className="text-xs font-mono text-tui-dim">Enter your details to get started</p>
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
            label="Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isLoading}
            error={errors.name?.message}
            {...register('name')}
          />

          <FormInput
            label="Email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
            {...register('email')}
          />

          <FormInput
            label="Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.password?.message}
            hint="Min 8 chars with uppercase, lowercase, and number"
            {...register('password')}
          />

          <FormInput
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="mb-2">
            <FormCheckbox
              label="I agree to the Terms and Privacy Policy"
              checked={acceptTerms}
              onChange={(e) => setValue('acceptTerms', (e.target as HTMLInputElement).checked)}
              disabled={isLoading}
            />
            {errors.acceptTerms && (
              <p className="text-xs font-mono text-tui-red mt-1">{errors.acceptTerms.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : '$ register'}
          </Button>
        </form>

        <p className="text-center text-xs font-mono text-tui-dim">
          Already have an account?{' '}
          <Link href="/login" className="text-tui-cyan no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </Panel>
  );
}
