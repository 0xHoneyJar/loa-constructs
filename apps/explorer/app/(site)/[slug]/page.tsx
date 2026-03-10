import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { BackButton } from '@/components/layout/back-button';
import { ConstructCard } from '@/components/construct/construct-card';
import { IdentityPanel } from '@/components/construct/identity-panel';
import { InstallCommand } from '@/components/construct/install-command';
import { CommandList } from '@/components/construct/command-list';
import { SkillGrid } from '@/components/construct/skill-grid';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Return empty — pages are ISR-generated on first request to avoid
// build-time API dependency that causes Vercel timeout failures.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const construct = await fetchConstruct(slug);

  if (!construct) {
    return {
      title: 'Not Found | Constructs Explorer',
    };
  }

  return {
    title: `${construct.name} | Constructs Explorer`,
    description: construct.description,
  };
}

export default async function ConstructPage({ params }: PageProps) {
  const { slug } = await params;
  const construct = await fetchConstruct(slug);

  if (!construct) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back navigation */}
      <div className="mb-8">
        <BackButton />
      </div>

      {/* Construct header */}
      <div className="mb-8">
        <ConstructCard construct={construct} />
      </div>

      {/* Identity — who this construct IS */}
      {construct.hasIdentity && construct.identity && (
        <div className="mb-8">
          <IdentityPanel identity={construct.identity} />
        </div>
      )}

      {/* Install command */}
      <div className="mb-8">
        <InstallCommand command={construct.installCommand} />
      </div>

      {/* Commands */}
      {construct.commands.length > 0 && (
        <div className="mb-8">
          <CommandList commands={construct.commands} />
        </div>
      )}

      {/* Skills (for packs) */}
      {construct.skills && construct.skills.length > 0 && (
        <div className="mb-8">
          <SkillGrid skills={construct.skills} packSlug={construct.slug} />
        </div>
      )}

      {/* Composes with */}
      {construct.composesWith.length > 0 && (
        <div className="mb-8">
          <div className="border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-bone-base">
              Composes With
            </h2>
            <div className="flex flex-wrap gap-2">
              {construct.composesWith.map((dep) => (
                <Link
                  key={dep}
                  href={`/constructs/${dep}`}
                  className="border border-bone-ghost px-2 py-1 text-xs font-mono text-bone-dim hover:bg-surface hover:text-bone-base transition-colors"
                >
                  {dep}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
