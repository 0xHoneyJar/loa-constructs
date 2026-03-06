import { Panel } from '@/components/ui/panel';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-mono text-bone-bright">Billing</h1>
        <p className="text-xs font-mono text-bone-muted mt-1">Manage your subscription and usage.</p>
      </div>

      <Panel title="Current Plan">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-mono text-cyan-base">FREE</span>
            <span className="border border-cyan-base px-2 py-0.5 text-[10px] font-mono text-cyan-base">
              ACTIVE
            </span>
          </div>
          <p className="text-xs font-mono text-bone-muted">
            You&apos;re on the free plan. Upgrade to access premium features.
          </p>
        </div>
      </Panel>

      <Panel title="Pricing">
        <p className="text-xs font-mono text-bone-muted">
          Premium pricing tiers coming soon. Stay tuned for announcements.
        </p>
      </Panel>
    </div>
  );
}
