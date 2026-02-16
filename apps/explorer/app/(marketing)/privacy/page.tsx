export const revalidate = 86400;

export const metadata = {
  title: 'Privacy Policy',
  description: 'Constructs Network Privacy Policy.',
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-mono font-bold text-white">Privacy Policy</h1>
      <p className="text-xs font-mono text-white/40">Last updated: February 15, 2026</p>

      <div className="space-y-6 text-xs font-mono text-white/60 leading-relaxed">
        <section>
          <h2 className="text-sm text-white font-bold mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly: email address, display name, and avatar URL when
            you create an account. We also collect usage data including construct downloads, API calls, and
            page views.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">2. How We Use Information</h2>
          <p>
            We use your information to provide the Service, improve our platform, communicate updates,
            and enforce our terms. Usage analytics help us understand how constructs are used.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">3. Data Storage</h2>
          <p>
            Your data is stored securely on Supabase (PostgreSQL) and cached via Upstash (Redis). Static
            assets are stored on Cloudflare R2. We use industry-standard security measures.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">4. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share anonymized, aggregated data for
            analytics purposes. We will disclose information if required by law.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">5. Cookies</h2>
          <p>
            We use cookies for authentication (access tokens, refresh tokens) and essential functionality.
            We do not use third-party tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">6. Your Rights</h2>
          <p>
            You can access, update, or delete your account data through your profile settings. To request
            complete data deletion, contact us at privacy@constructs.network.
          </p>
        </section>

        <section>
          <h2 className="text-sm text-white font-bold mb-2">7. Changes to Policy</h2>
          <p>
            We may update this policy from time to time. Significant changes will be communicated via
            email or prominent notice on the Service.
          </p>
        </section>
      </div>
    </div>
  );
}
