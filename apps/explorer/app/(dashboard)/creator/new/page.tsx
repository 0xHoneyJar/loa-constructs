'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { useCreateConstruct } from '@/lib/api/hooks';

const RESERVED_SLUGS = ['admin', 'api', 'auth', 'billing', 'creator', 'dashboard', 'login', 'register', 'settings', 'teams'];

const categories = [
  { value: 'development', label: 'Development' },
  { value: 'devops', label: 'DevOps' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const tiers = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'team', label: 'Team' },
  { value: 'enterprise', label: 'Enterprise' },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens')
    .refine((s) => !RESERVED_SLUGS.includes(s), 'This slug is reserved'),
  description: z.string().max(500),
  longDescription: z.string().max(10000),
  category: z.string(),
  tags: z.string(),
  tierRequired: z.string(),
  repositoryUrl: z.string(),
  documentationUrl: z.string(),
});

type CreateFormData = z.infer<typeof createSchema>;

export default function CreateConstructPage() {
  const router = useRouter();
  const createConstruct = useCreateConstruct();
  const [autoSlug, setAutoSlug] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      longDescription: '',
      category: 'other',
      tags: '',
      tierRequired: 'free',
      repositoryUrl: '',
      documentationUrl: '',
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    if (autoSlug) {
      setValue('slug', generateSlug(name));
    }
  };

  const onSubmit = async (data: CreateFormData) => {
    const result = await createConstruct.mutateAsync({
      ...data,
      tags: data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      isPublic: true,
      repositoryUrl: data.repositoryUrl || null,
      documentationUrl: data.documentationUrl || null,
    });
    router.push(`/creator/skills/${result.id}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/creator" className="text-xs font-mono text-tui-dim hover:text-tui-fg">
          ← Back
        </Link>
        <div>
          <h1 className="text-lg font-mono text-tui-bright">Create Construct</h1>
          <p className="text-xs font-mono text-tui-dim mt-1">Publish a new construct to the registry.</p>
        </div>
      </div>

      {createConstruct.isError && (
        <Panel title="Error" variant="danger">
          <p className="text-xs font-mono text-tui-red">
            {createConstruct.error?.message || 'Failed to create construct.'}
          </p>
        </Panel>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Panel title="Details">
          <div className="space-y-4">
            <FormInput
              label="Name"
              placeholder="My Awesome Construct"
              error={errors.name?.message}
              {...register('name', { onChange: handleNameChange })}
            />
            <FormInput
              label="Slug"
              placeholder="my-awesome-construct"
              hint="URL-friendly identifier. Only lowercase letters, numbers, and hyphens."
              error={errors.slug?.message}
              {...register('slug', {
                onChange: () => setAutoSlug(false),
              })}
            />
            <FormInput
              label="Short Description"
              placeholder="A brief description of what this construct does"
              error={errors.description?.message}
              {...register('description')}
            />

            <div>
              <label className="block text-xs font-mono text-tui-dim mb-1">Full Description</label>
              <textarea
                className="w-full bg-transparent border border-tui-border px-3 py-2 text-sm font-mono text-tui-fg placeholder:text-tui-dim/50 focus:outline-none focus:border-tui-accent"
                rows={4}
                placeholder="Detailed description. Markdown supported."
                {...register('longDescription')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-tui-dim mb-1">Category</label>
                <select
                  className="w-full bg-transparent border border-tui-border px-3 py-2 text-sm font-mono text-tui-fg focus:outline-none focus:border-tui-accent"
                  {...register('category')}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-tui-dim mb-1">Tier Required</label>
                <select
                  className="w-full bg-transparent border border-tui-border px-3 py-2 text-sm font-mono text-tui-fg focus:outline-none focus:border-tui-accent"
                  {...register('tierRequired')}
                >
                  {tiers.map((tier) => (
                    <option key={tier.value} value={tier.value}>{tier.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <FormInput
              label="Tags"
              placeholder="automation, testing, ci-cd"
              hint="Comma-separated (max 10)"
              {...register('tags')}
            />
          </div>
        </Panel>

        <Panel title="Optional">
          <div className="space-y-4">
            <FormInput
              label="Repository URL"
              type="url"
              placeholder="https://github.com/username/construct"
              error={errors.repositoryUrl?.message}
              {...register('repositoryUrl')}
            />
            <FormInput
              label="Documentation URL"
              type="url"
              placeholder="https://docs.example.com/construct"
              error={errors.documentationUrl?.message}
              {...register('documentationUrl')}
            />
          </div>
        </Panel>

        <div className="flex items-center justify-end gap-3">
          <Link href="/creator">
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createConstruct.isPending}>
            {createConstruct.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
