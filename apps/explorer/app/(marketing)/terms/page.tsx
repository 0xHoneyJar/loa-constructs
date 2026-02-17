export const revalidate = 86400;

export const metadata = {
  title: 'Terms of Service',
  description: 'Constructs Network Terms of Service.',
};

export default function TermsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-mono font-bold text-white">Terms of Service</h1>
      <p className="text-xs font-mono text-white/40">Last updated: February 15, 2026</p>

      <div className="space-y-6 text-xs font-mono text-white/60 leading-relaxed">
        <section>
          <h2 className="text-sm text-white font-bold mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Constructs Network (&quot;Service&quot;), you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">2. Service Description</h2>
          <p>
            The Constructs Network is a marketplace for AI agent constructs — skills, packs, and bundles
            that provide preserved expertise for AI agents.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account credentials. You must not
            share your API keys or access tokens with unauthorized parties.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">4. Content and Constructs</h2>
          <p>
            Creators retain ownership of constructs they publish. By publishing to the registry, you
            grant the Service a license to distribute your construct according to its specified license terms.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">5. Prohibited Uses</h2>
          <p>
            You may not use the Service to distribute malicious constructs, violate applicable laws, or
            interfere with the operation of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">6. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We are not liable for
            any damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">7. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </div>
  );
}
