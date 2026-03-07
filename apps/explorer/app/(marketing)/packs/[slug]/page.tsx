import { redirect } from 'next/navigation';

/**
 * /packs/[slug] redirects to /constructs/[slug]
 * The construct detail page is the canonical view with full identity,
 * verification, showcases, and prose. This prevents split-brain UX.
 */
export default async function PackDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/constructs/${slug}`);
}
