/**
 * JSON-LD Structured Data Components
 * For SEO rich snippets
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 *
 * SECURITY NOTE: JSON-LD data is serialized with JSON.stringify() which handles
 * proper escaping. However, if user-controlled strings are ever added to these
 * schemas, they should be sanitized to prevent script breakout attacks.
 * The sanitizeJsonLdString function below can be used for this purpose.
 */

/**
 * Sanitize a string for safe inclusion in JSON-LD to prevent script breakout.
 * Escapes </script> tags that could prematurely close the JSON-LD script element.
 */
export function sanitizeJsonLdString(str: string): string {
  if (typeof str !== 'string') return str;
  // Escape closing script tags to prevent script breakout
  return str.replace(/<\/script/gi, '<\\/script');
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Loa Constructs',
    alternateName: 'The Honey Jar',
    url: 'https://constructs.network',
    logo: 'https://constructs.network/logo.png',
    sameAs: [
      'https://x.com/0xhoneyjar',
      'https://github.com/0xHoneyJar',
      'https://discord.gg/thehoneyjar',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@thehoneyjar.xyz',
      contactType: 'customer service',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Loa Constructs',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform (via Claude Code)',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '29',
        priceCurrency: 'USD',
        priceValidUntil: '2027-12-31',
      },
      {
        '@type': 'Offer',
        name: 'Team',
        price: '99',
        priceCurrency: 'USD',
        priceValidUntil: '2027-12-31',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FAQPageJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  price,
  category
}: {
  name: string;
  description: string;
  price: number;
  category: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    category,
    offers: {
      '@type': 'Offer',
      price: price === 0 ? 'Free' : price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    brand: {
      '@type': 'Organization',
      name: 'Loa Constructs',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function BlogPostJsonLd({
  title,
  description,
  author,
  datePublished,
  url,
}: {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  url: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    author: {
      '@type': 'Organization',
      name: author,
    },
    datePublished,
    publisher: {
      '@type': 'Organization',
      name: 'Loa Constructs',
      logo: {
        '@type': 'ImageObject',
        url: 'https://constructs.network/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
