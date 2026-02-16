import { test as base } from '@playwright/test';

type Fixtures = {
  authenticated: void;
};

export const test = base.extend<Fixtures>({
  authenticated: [
    async ({ context }, use) => {
      await context.addCookies([
        {
          name: 'access_token',
          value: 'mock-test-token',
          domain: 'localhost',
          path: '/',
        },
        {
          name: 'refresh_token',
          value: 'mock-refresh-token',
          domain: 'localhost',
          path: '/',
        },
      ]);
      await use();
    },
    { auto: false },
  ],
});

export { expect } from '@playwright/test';
