/**
 * Create New Skill Page
 * @see sprint.md T10.5: Skill Publishing UI
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';

interface FormData {
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  category: string;
  tags: string;
  tierRequired: string;
  isPublic: boolean;
  repositoryUrl: string;
  documentationUrl: string;
}

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
  { value: 'free', label: 'Free', description: 'Available to all users' },
  { value: 'pro', label: 'Pro', description: 'Requires Pro subscription' },
  { value: 'team', label: 'Team', description: 'Requires Team subscription' },
  { value: 'enterprise', label: 'Enterprise', description: 'Requires Enterprise subscription' },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

export default function CreateSkillPage() {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
    longDescription: '',
    category: 'other',
    tags: '',
    tierRequired: 'free',
    isPublic: true,
    repositoryUrl: '',
    documentationUrl: '',
  });

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate slug from name if slug is empty or was auto-generated
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/creator/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0),
          repositoryUrl: formData.repositoryUrl || null,
          documentationUrl: formData.documentationUrl || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create skill');
      }

      // Redirect to the skill's page
      router.push(`/creator/skills/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/creator">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Skill</h1>
          <p className="text-muted-foreground">Publish a skill to the Loa Registry</p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Skill Details
            </CardTitle>
            <CardDescription>Basic information about your skill</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Skill"
                required
                maxLength={100}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="my-awesome-skill"
                required
                maxLength={100}
                pattern="^[a-z0-9-]+$"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of what this skill does"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Long Description */}
            <div className="space-y-2">
              <Label htmlFor="longDescription">Full Description</Label>
              <Textarea
                id="longDescription"
                value={formData.longDescription}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, longDescription: e.target.value }))
                }
                placeholder="Detailed description with usage examples, configuration options, etc. Markdown supported."
                rows={6}
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.longDescription.length}/10000 characters. Markdown supported.
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="automation, testing, ci-cd"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of tags (max 10 tags, 50 chars each)
              </p>
            </div>

            {/* Tier Required */}
            <div className="space-y-2">
              <Label>Tier Required</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tiers.map((tier) => (
                  <label
                    key={tier.value}
                    className={`flex flex-col items-center justify-center p-4 rounded-md border cursor-pointer transition-colors ${
                      formData.tierRequired === tier.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tierRequired"
                      value={tier.value}
                      checked={formData.tierRequired === tier.value}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tierRequired: e.target.value }))
                      }
                      className="sr-only"
                    />
                    <span className="font-medium">{tier.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {tier.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Public skill (visible in registry)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Optional Information
            </CardTitle>
            <CardDescription>Links to external resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Repository URL */}
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">Repository URL</Label>
              <Input
                id="repositoryUrl"
                type="url"
                value={formData.repositoryUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, repositoryUrl: e.target.value }))
                }
                placeholder="https://github.com/username/skill-repo"
              />
            </div>

            {/* Documentation URL */}
            <div className="space-y-2">
              <Label htmlFor="documentationUrl">Documentation URL</Label>
              <Input
                id="documentationUrl"
                type="url"
                value={formData.documentationUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, documentationUrl: e.target.value }))
                }
                placeholder="https://docs.example.com/my-skill"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Link href="/creator">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.name || !formData.slug}>
            {loading ? (
              <>
                <span className="animate-spin mr-2">...</span>
                Creating...
              </>
            ) : (
              'Create Skill'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
