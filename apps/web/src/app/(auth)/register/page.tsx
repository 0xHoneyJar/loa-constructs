/**
 * Register Page (TUI Style)
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

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
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
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser(data.email, data.password, data.name);
      router.push('/verify-email?email=' + encodeURIComponent(data.email));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/v1/auth/${provider}`;
  };

  return (
    <TuiBox title="Register">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <TuiH2>Create an account</TuiH2>
          <TuiDim>Enter your details to get started</TuiDim>
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

        {/* Registration Form */}
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
            label="Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isLoading}
            error={errors.name?.message}
            {...register('name')}
          />

          <TuiInput
            label="Email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
            {...register('email')}
          />

          <TuiInput
            label="Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.password?.message}
            hint="Min 8 chars with uppercase, lowercase, and number"
            {...register('password')}
          />

          <TuiInput
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div style={{ marginBottom: '8px' }}>
            <TuiCheckbox
              label={
                <span>
                  I agree to the{' '}
                  <Link href="/terms" style={{ color: 'var(--cyan)' }}>
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" style={{ color: 'var(--cyan)' }}>
                    Privacy Policy
                  </Link>
                </span>
              }
              checked={acceptTerms}
              onChange={(e) => setValue('acceptTerms', (e.target as HTMLInputElement).checked)}
              disabled={isLoading}
            />
            {errors.acceptTerms && (
              <span style={{ color: 'var(--red)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                {errors.acceptTerms.message}
              </span>
            )}
          </div>

          <TuiButton type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating account...' : '$ register'}
          </TuiButton>
        </form>

        <div style={{ textAlign: 'center' }}>
          <TuiDim>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </TuiDim>
        </div>
      </div>
    </TuiBox>
  );
}
