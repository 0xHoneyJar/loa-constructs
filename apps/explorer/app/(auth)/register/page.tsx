'use client';

import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center text-tui-dim font-mono text-sm">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
