import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchConstruct } from '@/lib/data/fetch-constructs';
import { BackButton } from '@/components/layout/back-button';
import { ConstructCard } from '@/components/construct/construct-card';
import { InstallCommand } from '@/components/construct/install-command';
import { CommandList } from '@/components/construct/command-list';
import { SkillGrid } from '@/components/construct/skill-grid';

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

      {/* Composes with (future) */}
      {construct.composesWith.length > 0 && (
        <div className="mb-8">
          <div className="border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-white">
              Composes With
            </h2>
            <p className="font-mono text-xs text-white/40">
              {construct.composesWith.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
