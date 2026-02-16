'use client';

import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network';

export function OAuthButtons({ disabled }: { disabled?: boolean }) {
  const handleOAuth = (provider: 'github' | 'google') => {
    window.location.href = `${API_URL}/v1/auth/oauth/${provider}/authorize`;
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="flex-1"
        type="button"
        disabled={disabled}
        onClick={() => handleOAuth('github')}
      >
        GitHub
      </Button>
      <Button
        variant="secondary"
        className="flex-1"
        type="button"
        disabled={disabled}
        onClick={() => handleOAuth('google')}
      >
        Google
      </Button>
    </div>
  );
}
