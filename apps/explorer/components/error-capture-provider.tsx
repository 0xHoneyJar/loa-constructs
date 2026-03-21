'use client';

import { useEffect } from 'react';
import { initErrorCapture } from '@loa-constructs/shared/error-capture';

export function ErrorCaptureProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_SIGNALS_API_KEY;
    if (!apiKey) return;

    initErrorCapture({
      endpoint: '/api/signals',
      apiKey,
      appSlug: 'constructs-explorer',
    });
  }, []);

  return null;
}
