'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-bone-muted font-mono text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
