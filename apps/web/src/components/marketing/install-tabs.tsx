/**
 * Install Tabs Client Component
 * Interactive package manager tabs for the landing page
 * @see sprint.md T26.2: Redesign Landing Page with GTM Copy
 */

'use client';

import { useState } from 'react';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiCode } from '@/components/tui/tui-text';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export function InstallTabs() {
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');

  return (
    <TuiBox title="Quick Install">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Package Manager Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((pm) => (
            <button
              key={pm}
              onClick={() => setPackageManager(pm)}
              style={{
                padding: '4px 12px',
                border: `1px solid ${packageManager === pm ? 'var(--accent)' : 'var(--border)'}`,
                background: packageManager === pm ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
                color: packageManager === pm ? 'var(--accent)' : 'var(--fg-dim)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
              }}
            >
              {pm}
            </button>
          ))}
        </div>

        {/* Install Command */}
        <TuiCode copyable>
          {packageManager === 'npm' && 'npx claude skills add gtm-collective'}
          {packageManager === 'pnpm' && 'pnpm dlx claude skills add gtm-collective'}
          {packageManager === 'yarn' && 'yarn dlx claude skills add gtm-collective'}
          {packageManager === 'bun' && 'bunx claude skills add gtm-collective'}
        </TuiCode>
      </div>
    </TuiBox>
  );
}

export default InstallTabs;
