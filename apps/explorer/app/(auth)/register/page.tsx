'use client';

import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center text-bone-muted font-mono text-sm">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
