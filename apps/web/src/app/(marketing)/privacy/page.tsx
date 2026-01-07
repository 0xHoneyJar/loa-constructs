/**
 * Privacy Policy Page
 * Privacy policy for the service
 * @see sprint.md T26.12: Create Legal Pages
 * @see gtm-grimoire/execution/website-copy-legal.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiDim, TuiLink } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Loa Constructs. Learn how we collect, use, and protect your data.',
};

const sections = [
  {
    id: 'collect',
    title: '1. Information We Collect',
    content: `1.1. Account Information
     - Email address (required)
     - Username (required)
     - Password (hashed, we can't read it)

1.2. Payment Information
     - Processed by Stripe
     - We don't store full card numbers
     - We receive: last 4 digits, expiry, card type

1.3. Usage Information
     - Pack installs (which packs, when)
     - Feature usage (anonymous analytics)
     - Error reports (if you submit them)

1.4. Technical Information
     - IP address (for security, rate limiting)
     - Browser/device type (for compatibility)
     - CLI version (for support)

1.5. What We DON'T Collect
     - Your code (stays on your machine)
     - Contents of your projects
     - Prompts or conversations with Claude`,
  },
  {
    id: 'use',
    title: '2. How We Use Your Information',
    content: `2.1. To provide the Service
     - Account management
     - Pack delivery
     - Subscription handling

2.2. To improve the Service
     - Usage analytics (aggregate, anonymized)
     - Error tracking
     - Feature prioritization

2.3. To communicate with you
     - Account notifications
     - Product updates (if opted in)
     - Support responses

2.4. To protect the Service
     - Fraud prevention
     - Abuse detection
     - Security monitoring`,
  },
  {
    id: 'sharing',
    title: '3. Information Sharing',
    content: `We don't sell your data. We share information only:

3.1. With service providers
     - Stripe (payments)
     - Neon (database hosting)
     - Fly.io (API hosting)
     - Cloudflare (CDN, storage)
     - Vercel (web hosting)

3.2. When required by law
     - Court orders
     - Legal process
     - Government requests

3.3. To protect rights
     - Enforce our Terms
     - Protect users
     - Prevent fraud

3.4. With your consent
     - Explicit permission for specific sharing`,
  },
  {
    id: 'security',
    title: '4. Data Security',
    content: `4.1. We use industry-standard security measures:
     - HTTPS encryption in transit
     - Encrypted database at rest
     - Secure password hashing (bcrypt)
     - Regular security audits

4.2. API keys are hashed; we can't retrieve them after creation.

4.3. We limit employee access to user data.

4.4. No security is perfect. We can't guarantee absolute security but we take it seriously.`,
  },
  {
    id: 'retention',
    title: '5. Data Retention',
    content: `5.1. Account data: Kept while your account is active.

5.2. After account deletion:
     - Personal data deleted within 30 days
     - Anonymized usage data may be retained
     - Backups purged within 90 days

5.3. Payment records: Kept for 7 years (legal requirement).

5.4. You can request data export or deletion anytime.`,
  },
  {
    id: 'rights',
    title: '6. Your Rights',
    content: `Depending on your location, you may have the right to:

6.1. Access your data
     - Export from Profile settings
     - Or email us

6.2. Correct your data
     - Update in Profile settings
     - Or email us for assistance

6.3. Delete your data
     - Delete account from Profile settings
     - Or email us

6.4. Object to processing
     - Contact us with concerns

6.5. Data portability
     - Export your data in JSON format

6.6. Withdraw consent
     - Unsubscribe from emails
     - Revoke connected accounts

To exercise these rights: privacy@thehoneyjar.xyz`,
  },
  {
    id: 'cookies',
    title: '7. Cookies and Tracking',
    content: `7.1. Essential cookies
     - Session management
     - Authentication
     - Security

7.2. Analytics (optional)
     - Anonymous usage tracking
     - Can be disabled in settings

7.3. We don't use:
     - Advertising cookies
     - Third-party trackers
     - Cross-site tracking

7.4. You can disable cookies in your browser, but some features may not work.`,
  },
  {
    id: 'international',
    title: '8. International Data Transfers',
    content: `8.1. Our servers are located in the United States.

8.2. If you're outside the US, your data may be transferred to and processed in the US.

8.3. We use standard contractual clauses and other safeguards for international transfers.`,
  },
  {
    id: 'children',
    title: '9. Children\'s Privacy',
    content: `9.1. The Service is not intended for children under 13.

9.2. We don't knowingly collect data from children under 13.

9.3. If you believe a child has provided us data, contact us and we'll delete it.`,
  },
  {
    id: 'changes',
    title: '10. Changes to This Policy',
    content: `10.1. We may update this Privacy Policy periodically.

10.2. Significant changes will be communicated via email or notice on the Service.

10.3. Continued use after changes constitutes acceptance.

10.4. Previous versions are available upon request.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      {/* Header */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              color: 'var(--fg-bright)',
              marginBottom: '12px',
            }}
          >
            Privacy Policy
          </h1>
          <TuiDim style={{ fontSize: '14px', display: 'block' }}>
            Last updated: January 8, 2026
          </TuiDim>
        </div>
      </section>

      {/* Introduction */}
      <section style={{ padding: '0 24px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiBox>
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--fg)' }}>
              <p style={{ marginBottom: '16px' }}>
                This Privacy Policy explains how The Honey Jar (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your information when you use Loa Constructs (&quot;Service&quot;).
              </p>
              <p style={{ color: 'var(--accent)', fontWeight: 500 }}>
                The short version: We collect minimal data, don&apos;t sell it, and your code never touches our servers.
              </p>
            </div>
          </TuiBox>
        </div>
      </section>

      {/* Table of Contents */}
      <section style={{ padding: '0 24px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TuiBox title="Contents">
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  style={{
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontSize: '13px',
                  }}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </TuiBox>
        </div>
      </section>

      {/* Sections */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {sections.map((section) => (
            <div key={section.id} id={section.id} style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  color: 'var(--fg-bright)',
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {section.title}
              </h2>
              <TuiBox>
                <pre
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: 'var(--fg)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    margin: 0,
                  }}
                >
                  {section.content}
                </pre>
              </TuiBox>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section
        style={{
          padding: '48px 24px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--fg-bright)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            Contact
          </h2>
          <TuiDim style={{ fontSize: '14px', display: 'block', marginBottom: '16px' }}>
            Privacy questions or concerns?
          </TuiDim>
          <TuiLink href="mailto:privacy@thehoneyjar.xyz">privacy@thehoneyjar.xyz</TuiLink>

          <div style={{ marginTop: '16px' }}>
            <TuiDim style={{ fontSize: '13px' }}>
              For EU residents: You may also contact your local data protection authority.
            </TuiDim>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link href="/terms" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px' }}>
              Terms of Service →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
