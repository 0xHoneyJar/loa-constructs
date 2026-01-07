/**
 * Terms of Service Page
 * Legal terms for the service
 * @see sprint.md T26.12: Create Legal Pages
 * @see gtm-grimoire/execution/website-copy-legal.md
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiDim, TuiLink } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Loa Constructs. Read our terms governing use of the service.',
};

const sections = [
  {
    id: 'account',
    title: '1. Account Terms',
    content: `1.1. You must be 13 or older to use this Service.

1.2. You must provide accurate information when creating an account.

1.3. You're responsible for keeping your password secure. We can't and won't be liable for any loss from unauthorized access to your account.

1.4. You're responsible for all activity under your account.

1.5. One person or entity per account. No shared accounts except for Team plans.

1.6. You may not use the Service for any illegal purpose or to violate any laws.`,
  },
  {
    id: 'acceptable-use',
    title: '2. Acceptable Use',
    content: `You agree not to:

2.1. Use the Service to distribute malware, viruses, or harmful code.

2.2. Attempt to gain unauthorized access to the Service or other users' accounts.

2.3. Use the Service to harass, abuse, or harm others.

2.4. Scrape or collect data from the Service without permission.

2.5. Resell or redistribute pack content without authorization.

2.6. Use automated systems to access the Service in a way that exceeds reasonable use.

2.7. Interfere with or disrupt the Service or servers.

We may suspend or terminate accounts that violate these terms.`,
  },
  {
    id: 'payment',
    title: '3. Payment Terms',
    content: `3.1. Free accounts have no payment obligations.

3.2. Paid subscriptions (Pro, Team, Enterprise) are billed monthly in advance.

3.3. All fees are non-refundable except:
     - Within 14 days of initial purchase (money-back guarantee)
     - Service was unavailable for extended periods
     - We made a billing error

3.4. We may change pricing with 30 days notice. Existing subscriptions continue at their current rate until renewal.

3.5. If payment fails, we'll attempt to charge again. After 7 days of failed payments, your subscription may be downgraded.

3.6. You can cancel anytime. Access continues until the end of your billing period.`,
  },
  {
    id: 'ip',
    title: '4. Intellectual Property',
    content: `4.1. The Service and its original content (excluding user content) remain our property.

4.2. Pack content you purchase is licensed, not sold. Your license is:
     - Non-exclusive
     - Non-transferable
     - For your use only (or your team's, for Team plans)

4.3. You may not redistribute, resell, or sublicense pack content.

4.4. Skills you install remain functional even if you cancel your subscription. However, you cannot download new versions or reinstall without an active subscription.

4.5. If you create and publish packs, you retain ownership of your content but grant us a license to distribute it through the Service.`,
  },
  {
    id: 'user-content',
    title: '5. User Content',
    content: `5.1. You retain ownership of content you create and submit.

5.2. By publishing packs or skills, you grant us a worldwide, non-exclusive license to host, distribute, and display your content through the Service.

5.3. You represent that you have the right to submit any content you provide.

5.4. We may remove content that violates these Terms or is reported as infringing.

5.5. We don't monitor or review all user content. You use third-party packs at your own risk.`,
  },
  {
    id: 'availability',
    title: '6. Service Availability',
    content: `6.1. We aim for high availability but don't guarantee 100% uptime.

6.2. We may modify or discontinue features with reasonable notice.

6.3. We're not liable for any loss resulting from service interruptions.

6.4. Scheduled maintenance will be announced in advance when possible.`,
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: `7.1. The Service is provided "as is" without warranties of any kind.

7.2. We don't warrant that:
     - The Service will be uninterrupted or error-free
     - Results from using the Service will be accurate
     - The Service will meet your specific requirements

7.3. To the maximum extent permitted by law, we're not liable for:
     - Indirect, incidental, or consequential damages
     - Loss of profits, data, or business opportunities
     - Damages exceeding the amount you paid us in the past 12 months

7.4. Some jurisdictions don't allow limitation of liability, so these limits may not apply to you.`,
  },
  {
    id: 'termination',
    title: '8. Termination',
    content: `8.1. You can close your account anytime from your profile settings.

8.2. We may suspend or terminate accounts that violate these Terms.

8.3. Upon termination:
     - Your access to the Service ends
     - Your data may be deleted after 30 days
     - Installed packs continue to work locally
     - Outstanding payments remain due

8.4. Sections that should survive termination will survive (limitation of liability, intellectual property, etc.).`,
  },
  {
    id: 'changes',
    title: '9. Changes to Terms',
    content: `9.1. We may update these Terms from time to time.

9.2. Significant changes will be communicated via email or prominent notice on the Service.

9.3. Continued use after changes constitutes acceptance.

9.4. If you don't agree with changes, you should stop using the Service.`,
  },
  {
    id: 'general',
    title: '10. General',
    content: `10.1. These Terms constitute the entire agreement between you and us regarding the Service.

10.2. Our failure to enforce any provision doesn't waive our right to enforce it later.

10.3. If any provision is found unenforceable, the remaining provisions continue in effect.

10.4. These Terms are governed by the laws of Delaware, United States.

10.5. Any disputes will be resolved in the courts of Delaware.`,
  },
];

export default function TermsPage() {
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
            Terms of Service
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
                These Terms of Service (&quot;Terms&quot;) govern your use of Loa Constructs (&quot;Service&quot;), operated by The Honey Jar (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
              </p>
              <p style={{ marginBottom: '16px' }}>
                By using the Service, you agree to these Terms. If you don&apos;t agree, don&apos;t use the Service.
              </p>
              <p style={{ color: 'var(--fg-dim)' }}>
                We keep these terms as simple as possible while covering the important stuff.
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
            Questions about these Terms? Contact us:
          </TuiDim>
          <TuiLink href="mailto:legal@thehoneyjar.xyz">legal@thehoneyjar.xyz</TuiLink>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px' }}>
              Privacy Policy →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
