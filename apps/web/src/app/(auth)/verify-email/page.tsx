/**
 * Verify Email Page
 * @see sprint.md T5.4: Email verification flow
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/v1/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify email');
      }

      setIsVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('No email address provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/v1/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend verification email');
      }

      setError(null);
      alert('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Token verification in progress
  if (token && isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Verifying email...</CardTitle>
          <CardDescription className="text-center">Please wait while we verify your email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verification successful
  if (isVerified) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Email verified!</CardTitle>
          <CardDescription className="text-center">
            Your email has been successfully verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You can now sign in to your account.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Verification failed with token
  if (token && error) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Verification failed</CardTitle>
          <CardDescription className="text-center">
            We couldn&apos;t verify your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
            {error}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            The verification link may have expired or is invalid.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Link href="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Try again</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Waiting for verification (no token, email provided after registration)
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Check your email</CardTitle>
        <CardDescription className="text-center">
          We&apos;ve sent a verification link to your email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {email && (
          <p className="text-sm text-muted-foreground text-center">
            Verification email sent to <strong>{email}</strong>
          </p>
        )}
        <p className="text-sm text-muted-foreground text-center">
          Click the link in the email to verify your account. If you don&apos;t see it, check your
          spam folder.
        </p>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
            {error}
          </div>
        )}

        {email && (
          <div className="text-center">
            <Button variant="outline" onClick={handleResendVerification} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Resend verification email'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already verified?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
