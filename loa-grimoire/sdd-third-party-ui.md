# Software Design Document: Third-Party Pack Submission UI

**Version**: 1.0.0
**Date**: 2026-01-21
**Author**: Software Architect Agent
**Status**: Final
**PRD Reference**: loa-grimoire/prd-third-party-ui.md
**GitHub Issue**: [#12 - Third-Party Pack Submissions](https://github.com/0xHoneyJar/loa-constructs/issues/12)

---

## 1. Executive Summary

This SDD details the frontend architecture for completing the third-party pack submission experience. The backend is fully implemented; this document focuses exclusively on the web application changes needed to connect the existing UI placeholders to the production API.

### 1.1 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Management** | React Hook Form + local state | Consistent with existing patterns, no global state needed |
| **API Client** | Native fetch with typed helpers | Match existing auth context pattern, add type safety |
| **File Upload** | Base64 encoding in JSON | API expects `{ path, content, mime_type }` array |
| **Form Validation** | Zod schemas from `@loa-constructs/shared` | Reuse backend validation schemas |
| **UI Components** | TUI library + shadcn/ui | Maintain existing aesthetic, use established patterns |

### 1.2 Scope

**In Scope**:
- Creator Dashboard: Pack list, create, edit, version upload, submit, withdraw
- Public Catalog: Browse, search, filter, pack detail pages
- Admin Dashboard: Review queue, approve/reject actions

**Out of Scope**:
- Stripe Connect onboarding (v1.1)
- Pack ratings/reviews (v1.2)
- Team-owned packs (v1.3)

---

## 2. System Architecture

### 2.1 Component Architecture

```
apps/web/src/
├── app/
│   ├── (dashboard)/
│   │   ├── creator/
│   │   │   ├── page.tsx                    # Pack list (ENHANCE)
│   │   │   ├── new/
│   │   │   │   └── page.tsx                # Create pack form (ENHANCE)
│   │   │   └── packs/
│   │   │       └── [slug]/
│   │   │           └── page.tsx            # Pack detail/edit (NEW)
│   │   └── admin/
│   │       └── reviews/
│   │           └── page.tsx                # Review queue (NEW)
│   └── (marketing)/
│       └── packs/
│           ├── page.tsx                    # Public catalog (ENHANCE)
│           └── [slug]/
│               └── page.tsx                # Public pack detail (NEW)
├── components/
│   ├── creator/
│   │   ├── create-pack-form.tsx            # NEW
│   │   ├── edit-pack-form.tsx              # NEW
│   │   ├── version-upload-form.tsx         # NEW
│   │   ├── submission-modal.tsx            # NEW
│   │   ├── withdrawal-modal.tsx            # NEW
│   │   └── pack-status-badge.tsx           # EXTRACT from page
│   ├── packs/
│   │   ├── pack-card.tsx                   # NEW (public)
│   │   ├── pack-grid.tsx                   # NEW (public)
│   │   ├── pack-search.tsx                 # NEW (public)
│   │   └── pack-filters.tsx                # NEW (public)
│   └── admin/
│       ├── review-queue-table.tsx          # NEW
│       └── review-action-modal.tsx         # NEW
└── lib/
    ├── api/
    │   ├── client.ts                       # NEW: Typed API client
    │   ├── packs.ts                        # NEW: Pack API functions
    │   └── admin.ts                        # NEW: Admin API functions
    └── hooks/
        ├── use-packs.ts                    # NEW: Pack data hooks
        └── use-pack-submission.ts          # NEW: Submission state hook
```

### 2.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Data Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Page Component                                                    │
│   ┌─────────────────┐                                              │
│   │  CreatorPage    │                                              │
│   │  ┌───────────┐  │                                              │
│   │  │ useEffect │──┼─── fetchCreatorPacks() ───┐                  │
│   │  └───────────┘  │                           │                  │
│   │  ┌───────────┐  │                           ▼                  │
│   │  │ useState  │◄─┼─── setData(result) ◄── API Response          │
│   │  │ - data    │  │                                              │
│   │  │ - loading │  │                                              │
│   │  │ - error   │  │                                              │
│   │  └───────────┘  │                                              │
│   └────────┬────────┘                                              │
│            │                                                        │
│            ▼                                                        │
│   Child Components                                                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│   │   PacksTable    │  │ SubmissionModal │  │VersionUpload    │   │
│   │   (read-only)   │  │ (action)        │  │ (action)        │   │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Client Design

### 3.1 Typed API Client

Create a centralized API client that wraps fetch with type safety and error handling.

**File**: `apps/web/src/lib/api/client.ts`

```typescript
import type { ApiResponse, ApiError, PaginatedResponse } from '@loa-constructs/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(error: ApiError['error']) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiClientError(data.error || {
      code: 'UNKNOWN',
      message: 'An unknown error occurred'
    });
  }

  return data;
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, token?: string) =>
    apiRequest<ApiResponse<T>>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    apiRequest<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      token
    }),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    apiRequest<ApiResponse<T>>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      token
    }),

  delete: <T>(endpoint: string, token?: string) =>
    apiRequest<ApiResponse<T>>(endpoint, { method: 'DELETE', token }),
};
```

### 3.2 Pack API Functions

**File**: `apps/web/src/lib/api/packs.ts`

```typescript
import { api, ApiClientError } from './client';
import type {
  Pack,
  PaginatedResponse,
  CreatePackInput,
  CreatePackVersionInput
} from '@loa-constructs/shared';

// Types for creator-specific responses
export interface CreatorPack extends Pack {
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deprecated';
  revenue: {
    total: number;
    pending: number;
    currency: string;
  };
}

export interface CreatorPacksResponse {
  packs: CreatorPack[];
  totals: {
    packs_count: number;
    total_downloads: number;
    total_revenue: number;
    pending_payout: number;
  };
}

export interface SubmissionStatus {
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn';
  submitted_at: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
}

// Creator APIs
export async function getCreatorPacks(token: string): Promise<CreatorPacksResponse> {
  const response = await api.get<CreatorPacksResponse>('/v1/creator/packs', token);
  return response.data;
}

export async function createPack(data: CreatePackInput, token: string): Promise<Pack> {
  const response = await api.post<Pack>('/v1/packs', data, token);
  return response.data;
}

export async function updatePack(
  slug: string,
  data: Partial<CreatePackInput>,
  token: string
): Promise<Pack> {
  const response = await api.patch<Pack>(`/v1/packs/${slug}`, data, token);
  return response.data;
}

export async function createPackVersion(
  slug: string,
  data: CreatePackVersionInput,
  token: string
): Promise<{ version: string; id: string }> {
  const response = await api.post<{ version: string; id: string }>(
    `/v1/packs/${slug}/versions`,
    data,
    token
  );
  return response.data;
}

export async function submitPackForReview(
  slug: string,
  notes?: string,
  token?: string
): Promise<{ status: string; submitted_at: string }> {
  const response = await api.post<{ status: string; submitted_at: string }>(
    `/v1/packs/${slug}/submit`,
    { submission_notes: notes },
    token
  );
  return response.data;
}

export async function withdrawSubmission(
  slug: string,
  token: string
): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>(
    `/v1/packs/${slug}/withdraw`,
    {},
    token
  );
  return response.data;
}

export async function getSubmissionStatus(
  slug: string,
  token: string
): Promise<SubmissionStatus> {
  const response = await api.get<SubmissionStatus>(
    `/v1/packs/${slug}/review-status`,
    token
  );
  return response.data;
}

// Public APIs
export async function getPublishedPacks(params?: {
  q?: string;
  category?: string;
  tier?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<Pack>> {
  const searchParams = new URLSearchParams();
  searchParams.set('status', 'published');
  if (params?.q) searchParams.set('q', params.q);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.tier) searchParams.set('tier', params.tier);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.per_page) searchParams.set('per_page', params.per_page.toString());

  return apiRequest<PaginatedResponse<Pack>>(`/v1/packs?${searchParams}`);
}

export async function getPackBySlug(slug: string): Promise<Pack> {
  const response = await api.get<Pack>(`/v1/packs/${slug}`);
  return response.data;
}

export async function getPackVersions(slug: string): Promise<PackVersion[]> {
  const response = await api.get<PackVersion[]>(`/v1/packs/${slug}/versions`);
  return response.data;
}
```

### 3.3 Admin API Functions

**File**: `apps/web/src/lib/api/admin.ts`

```typescript
import { api } from './client';
import type { Pack } from '@loa-constructs/shared';

export interface PendingSubmission {
  id: string;
  pack: Pack;
  submitted_at: string;
  submission_notes?: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  version: {
    version: string;
    file_count: number;
  };
}

export interface ReviewDecision {
  decision: 'approved' | 'rejected';
  reviewNotes: string;
  rejectionReason?: string;
}

export async function getPendingSubmissions(token: string): Promise<PendingSubmission[]> {
  const response = await api.get<PendingSubmission[]>('/v1/admin/packs/pending', token);
  return response.data;
}

export async function submitReview(
  packId: string,
  decision: ReviewDecision,
  token: string
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(
    `/v1/admin/packs/${packId}/review`,
    decision,
    token
  );
  return response.data;
}
```

---

## 4. Component Design

### 4.1 Creator Dashboard Components

#### 4.1.1 Create Pack Form

**File**: `apps/web/src/components/creator/create-pack-form.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { slugSchema } from '@loa-constructs/shared';
import { TuiInput, TuiTextarea, TuiSelect } from '@/components/tui';
import { TuiButton } from '@/components/tui/tui-button';
import { useAuth } from '@/contexts/auth-context';
import { createPack } from '@/lib/api/packs';

const createPackFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  tierRequired: z.enum(['free', 'pro', 'team']).default('free'),
  tags: z.string().optional(), // Comma-separated, transformed to array
});

type CreatePackFormData = z.infer<typeof createPackFormSchema>;

const tierOptions = [
  { value: 'free', label: 'Free - Available to all users' },
  { value: 'pro', label: 'Pro - Requires Pro subscription ($29/mo)' },
  { value: 'team', label: 'Team - Requires Team subscription ($99/mo)' },
];

export function CreatePackForm() {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePackFormData>({
    resolver: zodResolver(createPackFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      tierRequired: 'free',
      tags: '',
    },
  });

  // Auto-generate slug from name
  const name = watch('name');
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue('name', newName);
    // Generate slug: lowercase, replace spaces with hyphens, remove special chars
    const slug = newName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 100);
    setValue('slug', slug);
  };

  const onSubmit = async (data: CreatePackFormData) => {
    const token = getAccessToken();
    if (!token) {
      setError('You must be logged in to create a pack');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const pack = await createPack(
        {
          name: data.name,
          slug: data.slug,
          description: data.description,
          pricing: {
            type: data.tierRequired === 'free' ? 'free' : 'subscription',
            tier_required: data.tierRequired,
          },
        },
        token
      );
      router.push(`/creator/packs/${pack.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pack');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && (
        <div className="p-4 border border-red bg-red/10 text-red">
          {error}
        </div>
      )}

      <TuiInput
        label="Pack Name"
        placeholder="My Awesome Pack"
        error={errors.name?.message}
        {...register('name')}
        onChange={handleNameChange}
      />

      <TuiInput
        label="Slug"
        placeholder="my-awesome-pack"
        hint="URL-friendly identifier. Auto-generated from name."
        error={errors.slug?.message}
        {...register('slug')}
      />

      <TuiTextarea
        label="Description"
        placeholder="A brief description of what your pack does..."
        hint="Max 500 characters"
        error={errors.description?.message}
        {...register('description')}
      />

      <TuiSelect
        label="Required Tier"
        options={tierOptions}
        error={errors.tierRequired?.message}
        {...register('tierRequired')}
      />

      <TuiInput
        label="Tags"
        placeholder="gtm, marketing, sales"
        hint="Comma-separated tags for discovery"
        {...register('tags')}
      />

      <div className="flex gap-4">
        <TuiButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Pack'}
        </TuiButton>
        <TuiButton
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </TuiButton>
      </div>
    </form>
  );
}
```

#### 4.1.2 Version Upload Form

**File**: `apps/web/src/components/creator/version-upload-form.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { semverSchema } from '@loa-constructs/shared';
import { TuiInput, TuiTextarea } from '@/components/tui';
import { TuiButton } from '@/components/tui/tui-button';
import { Upload, File, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { createPackVersion } from '@/lib/api/packs';

const versionUploadSchema = z.object({
  version: semverSchema,
  changelog: z.string().max(5000).optional(),
});

type VersionUploadData = z.infer<typeof versionUploadSchema>;

interface FileWithContent {
  path: string;
  content: string; // base64
  mime_type: string;
  size: number;
}

interface VersionUploadFormProps {
  packSlug: string;
  onSuccess: () => void;
}

export function VersionUploadForm({ packSlug, onSuccess }: VersionUploadFormProps) {
  const { getAccessToken } = useAuth();
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VersionUploadData>({
    resolver: zodResolver(versionUploadSchema),
  });

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileWithContent[] = [];

    for (const file of Array.from(fileList)) {
      // Read file as base64
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      newFiles.push({
        path: file.webkitRelativePath || file.name,
        content,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: VersionUploadData) => {
    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError('You must be logged in');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Find manifest file to extract metadata
      const manifestFile = files.find(
        (f) => f.path === 'manifest.json' || f.path.endsWith('/manifest.json')
      );

      let manifest;
      if (manifestFile) {
        manifest = JSON.parse(atob(manifestFile.content));
      } else {
        // Create minimal manifest
        manifest = {
          name: packSlug,
          slug: packSlug,
          version: data.version,
        };
      }

      await createPackVersion(
        packSlug,
        {
          version: data.version,
          changelog: data.changelog,
          manifest,
          files: files.map((f) => ({
            path: f.path,
            content: f.content,
            mime_type: f.mime_type,
          })),
        },
        token
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload version');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 border border-red bg-red/10 text-red">
          {error}
        </div>
      )}

      <TuiInput
        label="Version"
        placeholder="1.0.0"
        hint="Semantic versioning (major.minor.patch)"
        error={errors.version?.message}
        {...register('version')}
      />

      <TuiTextarea
        label="Changelog"
        placeholder="What's new in this version..."
        hint="Optional - describe the changes"
        error={errors.changelog?.message}
        {...register('changelog')}
      />

      {/* File Drop Zone */}
      <div>
        <label className="block text-sm font-medium mb-2">Files</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed p-8 text-center cursor-pointer
            transition-colors
            ${dragActive ? 'border-accent bg-accent/10' : 'border-border'}
          `}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-dim" />
          <p className="text-dim">
            Drag & drop files here, or click to select
          </p>
          <p className="text-xs text-dim mt-1">
            Include manifest.json, skills/, commands/, etc.
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            webkitdirectory=""
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="border border-border">
          <div className="p-2 border-b border-border bg-bg-secondary">
            <span className="text-sm">{files.length} file(s) selected</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-dim" />
                  <span className="text-sm font-mono">{file.path}</span>
                  <span className="text-xs text-dim">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-dim hover:text-red"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <TuiButton type="submit" disabled={isUploading || files.length === 0}>
        {isUploading ? 'Uploading...' : 'Upload Version'}
      </TuiButton>
    </form>
  );
}
```

#### 4.1.3 Submission Modal

**File**: `apps/web/src/components/creator/submission-modal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { TuiTextarea } from '@/components/tui';
import { TuiButton } from '@/components/tui/tui-button';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { submitPackForReview } from '@/lib/api/packs';

interface SubmissionModalProps {
  packSlug: string;
  packName: string;
  hasVersion: boolean;
  hasDescription: boolean;
  isEmailVerified: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmissionModal({
  packSlug,
  packName,
  hasVersion,
  hasDescription,
  isEmailVerified,
  onClose,
  onSuccess,
}: SubmissionModalProps) {
  const { getAccessToken } = useAuth();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = hasVersion && hasDescription && isEmailVerified;

  const handleSubmit = async () => {
    const token = getAccessToken();
    if (!token || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitPackForReview(packSlug, notes || undefined, token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-bg border border-border max-w-md w-full p-6">
        <h2 className="text-lg font-bold mb-4">Submit for Review</h2>
        <p className="text-dim mb-6">
          Submit <strong>{packName}</strong> for review by the Loa team.
        </p>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          <ChecklistItem checked={isEmailVerified} label="Email verified" />
          <ChecklistItem checked={hasVersion} label="At least one version uploaded" />
          <ChecklistItem checked={hasDescription} label="Description provided" />
        </div>

        {canSubmit ? (
          <>
            <TuiTextarea
              label="Notes for Reviewers (optional)"
              placeholder="Anything you'd like reviewers to know..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4"
            />

            <p className="text-sm text-dim mb-6">
              Reviews typically take 2-3 business days. You'll receive an email
              when a decision is made.
            </p>
          </>
        ) : (
          <div className="p-4 border border-yellow bg-yellow/10 text-yellow mb-6">
            Please complete all requirements before submitting.
          </div>
        )}

        {error && (
          <div className="p-4 border border-red bg-red/10 text-red mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <TuiButton
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </TuiButton>
          <TuiButton variant="secondary" onClick={onClose}>
            Cancel
          </TuiButton>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="h-5 w-5 text-green" />
      ) : (
        <AlertCircle className="h-5 w-5 text-yellow" />
      )}
      <span className={checked ? 'text-fg' : 'text-dim'}>{label}</span>
    </div>
  );
}
```

### 4.2 Public Catalog Components

#### 4.2.1 Pack Card

**File**: `apps/web/src/components/packs/pack-card.tsx`

```typescript
import Link from 'next/link';
import { TuiTag, TuiDim } from '@/components/tui/tui-text';
import type { Pack } from '@loa-constructs/shared';

interface PackCardProps {
  pack: Pack;
}

function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function PackCard({ pack }: PackCardProps) {
  const isPremium = pack.tier_required !== 'free';

  return (
    <Link href={`/packs/${pack.slug}`} style={{ textDecoration: 'none' }}>
      <div
        className="tui-card-hover"
        style={{
          padding: '20px',
          border: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.75)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '15px' }}>
            {pack.name}
          </h3>
          {isPremium ? (
            <TuiTag color="accent">
              {pack.tier_required.toUpperCase()}
            </TuiTag>
          ) : (
            <TuiTag color="green">FREE</TuiTag>
          )}
        </div>

        {/* Description */}
        <TuiDim style={{ fontSize: '13px', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
          {pack.description || 'No description provided'}
        </TuiDim>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {pack.owner && (
              <span style={{ color: 'var(--cyan)' }}>{pack.owner.name}</span>
            )}
            {pack.latest_version && (
              <span style={{ color: 'var(--fg-dim)' }}>v{pack.latest_version.version}</span>
            )}
          </div>
          <span style={{ color: 'var(--fg-dim)' }}>
            {formatDownloads(pack.downloads)} ↓
          </span>
        </div>
      </div>
    </Link>
  );
}
```

#### 4.2.2 Pack Search

**File**: `apps/web/src/components/packs/pack-search.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TuiSearchInput } from '@/components/tui';

const CATEGORIES = ['All', 'GTM', 'Security', 'Documentation', 'DevOps', 'Development', 'Testing'];
const TIERS = ['All', 'Free', 'Pro', 'Team'];

export function PackSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [tier, setTier] = useState(searchParams.get('tier') || 'All');

  const updateSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'All') params.set('category', category.toLowerCase());
    if (tier !== 'All') params.set('tier', tier.toLowerCase());
    router.push(`/packs?${params.toString()}`);
  }, [query, category, tier, router]);

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search Input */}
      <div style={{ flex: '1 1 300px', minWidth: '200px' }}>
        <TuiSearchInput
          placeholder="Search packs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateSearch()}
        />
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setTimeout(updateSearch, 0);
            }}
            style={{
              padding: '6px 14px',
              border: `1px solid ${cat === category ? 'var(--accent)' : 'var(--border)'}`,
              background: cat === category ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
              color: cat === category ? 'var(--accent)' : 'var(--fg-dim)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tier Filter */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTier(t);
              setTimeout(updateSearch, 0);
            }}
            style={{
              padding: '6px 14px',
              border: `1px solid ${t === tier ? 'var(--green)' : 'var(--border)'}`,
              background: t === tier ? 'rgba(95, 255, 135, 0.1)' : 'transparent',
              color: t === tier ? 'var(--green)' : 'var(--fg-dim)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 4.3 Admin Review Components

#### 4.3.1 Review Queue Table

**File**: `apps/web/src/components/admin/review-queue-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { TuiButton } from '@/components/tui/tui-button';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import type { PendingSubmission } from '@/lib/api/admin';

interface ReviewQueueTableProps {
  submissions: PendingSubmission[];
  onReview: (submission: PendingSubmission, decision: 'approve' | 'reject') => void;
  onPreview: (submission: PendingSubmission) => void;
}

export function ReviewQueueTable({ submissions, onReview, onPreview }: ReviewQueueTableProps) {
  if (submissions.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green mb-4" />
        <h3 className="text-lg font-medium mb-2">All caught up!</h3>
        <p className="text-dim">No packs pending review.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 text-sm font-medium text-dim">Pack</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-dim">Creator</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-dim">Submitted</th>
            <th className="text-center py-3 px-2 text-sm font-medium text-dim">Version</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-dim">Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id} className="border-b border-border last:border-0 hover:bg-white/5">
              <td className="py-4 px-2">
                <div>
                  <p className="font-medium">{submission.pack.name}</p>
                  <p className="text-sm text-dim">{submission.pack.slug}</p>
                </div>
              </td>
              <td className="py-4 px-2">
                <div>
                  <p>{submission.creator.name}</p>
                  <p className="text-sm text-dim">{submission.creator.email}</p>
                </div>
              </td>
              <td className="py-4 px-2 text-dim">
                {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
              </td>
              <td className="text-center py-4 px-2 font-mono">
                {submission.version.version}
              </td>
              <td className="text-right py-4 px-2">
                <div className="flex items-center justify-end gap-2">
                  <TuiButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onPreview(submission)}
                  >
                    <Eye className="h-4 w-4" />
                  </TuiButton>
                  <TuiButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onReview(submission, 'approve')}
                  >
                    <CheckCircle className="h-4 w-4 text-green" />
                  </TuiButton>
                  <TuiButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onReview(submission, 'reject')}
                  >
                    <XCircle className="h-4 w-4 text-red" />
                  </TuiButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### 4.3.2 Review Action Modal

**File**: `apps/web/src/components/admin/review-action-modal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { TuiTextarea, TuiSelect } from '@/components/tui';
import { TuiButton } from '@/components/tui/tui-button';
import { useAuth } from '@/contexts/auth-context';
import { submitReview, type PendingSubmission } from '@/lib/api/admin';

interface ReviewActionModalProps {
  submission: PendingSubmission;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

const REJECTION_REASONS = [
  { value: 'quality_standards', label: 'Does not meet quality standards' },
  { value: 'incomplete_content', label: 'Missing required files' },
  { value: 'duplicate_functionality', label: 'Too similar to existing pack' },
  { value: 'policy_violation', label: 'Violates terms of service' },
  { value: 'security_concern', label: 'Potential security issues' },
];

export function ReviewActionModal({
  submission,
  action,
  onClose,
  onSuccess,
}: ReviewActionModalProps) {
  const { getAccessToken } = useAuth();
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('quality_standards');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('Review notes are required');
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitReview(
        submission.pack.id,
        {
          decision: action === 'approve' ? 'approved' : 'rejected',
          reviewNotes: notes,
          rejectionReason: action === 'reject' ? reason : undefined,
        },
        token
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-bg border border-border max-w-lg w-full p-6">
        <h2 className="text-lg font-bold mb-2">
          {action === 'approve' ? 'Approve Pack' : 'Reject Pack'}
        </h2>
        <p className="text-dim mb-6">
          {action === 'approve'
            ? `Approve "${submission.pack.name}" for publication?`
            : `Reject "${submission.pack.name}" with feedback?`}
        </p>

        {action === 'reject' && (
          <TuiSelect
            label="Rejection Reason"
            options={REJECTION_REASONS}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-4"
          />
        )}

        <TuiTextarea
          label="Review Notes"
          placeholder={
            action === 'approve'
              ? 'Great pack! Well documented and useful.'
              : 'Please provide specific feedback for the creator...'
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          className="mb-4"
        />

        {error && (
          <div className="p-4 border border-red bg-red/10 text-red mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <TuiButton
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant={action === 'approve' ? 'primary' : 'danger'}
          >
            {isSubmitting
              ? 'Submitting...'
              : action === 'approve'
              ? 'Approve'
              : 'Reject'}
          </TuiButton>
          <TuiButton variant="secondary" onClick={onClose}>
            Cancel
          </TuiButton>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Page Implementations

### 5.1 Creator Pack Detail Page

**File**: `apps/web/src/app/(dashboard)/creator/packs/[slug]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TuiButton } from '@/components/tui/tui-button';
import { useAuth } from '@/contexts/auth-context';
import { EditPackForm } from '@/components/creator/edit-pack-form';
import { VersionUploadForm } from '@/components/creator/version-upload-form';
import { SubmissionModal } from '@/components/creator/submission-modal';
import { StatusBadge } from '@/components/creator/pack-status-badge';
import {
  getPackBySlug,
  getPackVersions,
  getSubmissionStatus,
  withdrawSubmission,
  type SubmissionStatus
} from '@/lib/api/packs';
import type { Pack, PackVersionSummary } from '@loa-constructs/shared';
import { Package, Upload, Send, Undo2, Trash2 } from 'lucide-react';

export default function CreatorPackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getAccessToken, user } = useAuth();
  const slug = params.slug as string;

  const [pack, setPack] = useState<Pack | null>(null);
  const [versions, setVersions] = useState<PackVersionSummary[]>([]);
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const fetchData = async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const [packData, versionsData] = await Promise.all([
        getPackBySlug(slug),
        getPackVersions(slug),
      ]);
      setPack(packData);
      setVersions(versionsData);

      // Try to get submission status (may fail if never submitted)
      try {
        const submissionData = await getSubmissionStatus(slug, token);
        setSubmission(submissionData);
      } catch {
        setSubmission(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pack');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug, getAccessToken]);

  const handleWithdraw = async () => {
    const token = getAccessToken();
    if (!token || !confirm('Withdraw this submission?')) return;

    try {
      await withdrawSubmission(slug, token);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to withdraw');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive">{error || 'Pack not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const status = (pack as any).status || 'draft';
  const canEdit = status === 'draft' || status === 'rejected';
  const canSubmit = (status === 'draft' || status === 'rejected') && versions.length > 0;
  const canWithdraw = status === 'pending_review';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pack.name}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-muted-foreground">{pack.slug}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canSubmit && (
            <TuiButton onClick={() => setShowSubmissionModal(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </TuiButton>
          )}
          {canWithdraw && (
            <TuiButton variant="secondary" onClick={handleWithdraw}>
              <Undo2 className="h-4 w-4 mr-2" />
              Withdraw
            </TuiButton>
          )}
        </div>
      </div>

      {/* Submission Feedback */}
      {submission && submission.status === 'rejected' && (
        <Card className="border-red">
          <CardHeader>
            <CardTitle className="text-red">Submission Rejected</CardTitle>
            <CardDescription>
              Reason: {submission.rejection_reason?.replace('_', ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-dim">{submission.review_notes}</p>
            <p className="text-sm text-dim mt-2">
              Please address the feedback and resubmit.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pack Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Pack Details</CardTitle>
            <CardDescription>
              {canEdit ? 'Edit your pack metadata' : 'Pack details (read-only while in review)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditPackForm pack={pack} disabled={!canEdit} onUpdate={fetchData} />
          </CardContent>
        </Card>

        {/* Versions */}
        <Card>
          <CardHeader>
            <CardTitle>Versions</CardTitle>
            <CardDescription>
              {versions.length} version(s) published
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Version List */}
            <div className="space-y-2 mb-4">
              {versions.map((version) => (
                <div
                  key={version.version}
                  className="flex items-center justify-between p-3 border border-border rounded"
                >
                  <div>
                    <span className="font-mono font-medium">{version.version}</span>
                    {version.is_latest && (
                      <span className="ml-2 text-xs bg-green/20 text-green px-2 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-dim">
                    {version.file_count} files
                  </span>
                </div>
              ))}
            </div>

            {/* Upload Button/Form */}
            {canEdit && (
              showUploadForm ? (
                <VersionUploadForm
                  packSlug={slug}
                  onSuccess={() => {
                    setShowUploadForm(false);
                    fetchData();
                  }}
                />
              ) : (
                <TuiButton
                  variant="secondary"
                  onClick={() => setShowUploadForm(true)}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Version
                </TuiButton>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Modal */}
      {showSubmissionModal && (
        <SubmissionModal
          packSlug={slug}
          packName={pack.name}
          hasVersion={versions.length > 0}
          hasDescription={!!pack.description}
          isEmailVerified={user?.email_verified ?? false}
          onClose={() => setShowSubmissionModal(false)}
          onSuccess={() => {
            setShowSubmissionModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
```

### 5.2 Public Pack Catalog Page (Enhanced)

**File**: `apps/web/src/app/(marketing)/packs/page.tsx` (REPLACE)

```typescript
/**
 * Public Packs Catalog Page - API Connected
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH2, TuiDim } from '@/components/tui/tui-text';
import { PackGrid } from '@/components/packs/pack-grid';
import { PackSearch } from '@/components/packs/pack-search';
import { getPublishedPacks } from '@/lib/api/packs';

export const metadata: Metadata = {
  title: 'Packs',
  description: 'Browse skill packs for Claude Code.',
};

interface PageProps {
  searchParams: {
    q?: string;
    category?: string;
    tier?: string;
    page?: string;
  };
}

export default async function PacksPage({ searchParams }: PageProps) {
  const { q, category, tier, page } = searchParams;

  const packs = await getPublishedPacks({
    q,
    category,
    tier,
    page: page ? parseInt(page) : 1,
    per_page: 20,
  });

  const featuredPack = packs.data.find((p) => p.is_featured);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '12px',
          }}
        >
          Skill Packs
        </h1>
        <TuiDim style={{ fontSize: '15px', display: 'block', maxWidth: '500px', margin: '0 auto' }}>
          Pre-built agent workflows for Claude Code. Install in one command.
        </TuiDim>
      </section>

      {/* Search & Filters */}
      <section style={{ padding: '0 24px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Suspense fallback={<div>Loading...</div>}>
            <PackSearch />
          </Suspense>
        </div>
      </section>

      {/* Featured Pack */}
      {featuredPack && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <TuiDim style={{ fontSize: '12px', marginBottom: '12px', display: 'block' }}>
              FEATURED
            </TuiDim>
            <Link href={`/packs/${featuredPack.slug}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  padding: '24px',
                  border: '2px solid var(--accent)',
                  background: 'rgba(95, 175, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 400px' }}>
                  <h2 style={{ color: 'var(--fg-bright)', fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>
                    {featuredPack.name}
                  </h2>
                  <TuiDim style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                    {featuredPack.description}
                  </TuiDim>
                </div>
                <TuiButton>View Pack →</TuiButton>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Pack Grid */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>
            {q ? `Results for "${q}"` : 'All Packs'}
            <span style={{ color: 'var(--fg-dim)', fontWeight: 400, fontSize: '14px', marginLeft: '12px' }}>
              ({packs.pagination.total} packs)
            </span>
          </TuiH2>

          <PackGrid packs={packs.data} />

          {/* Pagination */}
          {packs.pagination.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
              {Array.from({ length: packs.pagination.total_pages }, (_, i) => (
                <Link
                  key={i}
                  href={`/packs?${new URLSearchParams({ ...searchParams, page: (i + 1).toString() })}`}
                >
                  <TuiButton
                    variant={packs.pagination.page === i + 1 ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    {i + 1}
                  </TuiButton>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Want to create your own pack?</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Earn 70% revenue share on every subscription using your packs.
        </TuiDim>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register">
            <TuiButton>Become a Creator</TuiButton>
          </Link>
          <Link href="/docs/CONTRIBUTING-PACKS">
            <TuiButton variant="secondary">Read the Docs</TuiButton>
          </Link>
        </div>
      </section>
    </>
  );
}
```

### 5.3 Admin Review Dashboard Page

**File**: `apps/web/src/app/(dashboard)/admin/reviews/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { ReviewQueueTable } from '@/components/admin/review-queue-table';
import { ReviewActionModal } from '@/components/admin/review-action-modal';
import { getPendingSubmissions, type PendingSubmission } from '@/lib/api/admin';

export default function AdminReviewsPage() {
  const { getAccessToken } = useAuth();
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<{
    submission: PendingSubmission;
    action: 'approve' | 'reject';
  } | null>(null);

  const fetchSubmissions = async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const data = await getPendingSubmissions(token);
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [getAccessToken]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground">
          Pending pack submissions awaiting review
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Submissions</CardTitle>
            <CardDescription>
              {submissions.length} pack(s) waiting for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewQueueTable
              submissions={submissions}
              onReview={(submission, action) => setReviewTarget({ submission, action })}
              onPreview={(submission) => {
                window.open(`/packs/${submission.pack.slug}`, '_blank');
              }}
            />
          </CardContent>
        </Card>
      )}

      {reviewTarget && (
        <ReviewActionModal
          submission={reviewTarget.submission}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewTarget(null);
            fetchSubmissions();
          }}
        />
      )}
    </div>
  );
}
```

---

## 6. Data Models

### 6.1 Frontend Types

All types are imported from `@loa-constructs/shared`. Key types used:

| Type | Source | Usage |
|------|--------|-------|
| `Pack` | `shared/types.ts` | Pack metadata |
| `PackVersionSummary` | `shared/types.ts` | Version list items |
| `SubscriptionTier` | `shared/types.ts` | Tier filtering |
| `CreatePackInput` | `shared/validation.ts` | Form data |
| `CreatePackVersionInput` | `shared/validation.ts` | Version upload |

### 6.2 Form Schemas

Reuse Zod schemas from shared package:

| Schema | File | Usage |
|--------|------|-------|
| `createPackSchema` | `shared/validation.ts` | Create pack form |
| `createPackVersionSchema` | `shared/validation.ts` | Version upload |
| `slugSchema` | `shared/validation.ts` | Slug validation |
| `semverSchema` | `shared/validation.ts` | Version validation |

---

## 7. Security Considerations

### 7.1 Authentication

- All creator routes protected by `ProtectedRoute` component
- Access token passed to API calls via auth context
- Admin routes require additional role check

### 7.2 Authorization

- Backend enforces ownership checks (creator can only edit own packs)
- Backend enforces rate limiting (5 submissions/24h)
- Backend validates email verification before submission

### 7.3 Input Validation

- Client-side validation with Zod (same schemas as backend)
- Server-side validation catches any bypass attempts
- File content sanitized (base64 encoding)

### 7.4 XSS Prevention

- React automatically escapes rendered content
- Markdown rendered with sanitization library (if adding markdown support)
- No `dangerouslySetInnerHTML` usage

---

## 8. Performance Considerations

### 8.1 Data Fetching

| Strategy | Implementation |
|----------|----------------|
| Server Components | Public catalog pages use RSC for initial data |
| Client-side fetch | Creator dashboard uses client-side for mutations |
| Pagination | 20 items per page default |
| Lazy loading | Version upload form shown on demand |

### 8.2 File Upload

| Consideration | Implementation |
|---------------|----------------|
| File size | Validate client-side before upload |
| Progress | Show upload progress indicator |
| Chunking | Not implemented (API handles full payload) |
| Base64 | ~33% size increase; acceptable for pack files |

### 8.3 Caching

- No explicit caching (API handles cache headers)
- React Query could be added for cache management (future enhancement)

---

## 9. Error Handling

### 9.1 API Errors

```typescript
// Centralized error handling in API client
try {
  await apiCall();
} catch (err) {
  if (err instanceof ApiClientError) {
    // Known API error
    setError(err.message);
    if (err.code === 'UNAUTHORIZED') router.push('/login');
    if (err.code === 'RATE_LIMITED') setError('Too many submissions. Try again tomorrow.');
  } else {
    // Unknown error
    setError('An unexpected error occurred');
  }
}
```

### 9.2 Form Errors

- Inline field errors from Zod validation
- Form-level errors displayed in alert box
- Submit button disabled during submission

### 9.3 Loading States

- Spinner for initial page load
- Button disabled + "Loading..." text during actions
- Skeleton components (future enhancement)

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Component | Test Focus |
|-----------|------------|
| `CreatePackForm` | Validation, slug generation |
| `VersionUploadForm` | File handling, base64 encoding |
| `SubmissionModal` | Checklist logic, submit flow |
| `PackCard` | Rendering with different data |

### 10.2 Integration Tests

| Flow | Test Steps |
|------|------------|
| Pack Creation | Form submit → API call → redirect |
| Version Upload | File select → encode → API call |
| Submit for Review | Modal open → submit → status update |
| Admin Review | Queue load → approve → email sent |

### 10.3 E2E Tests (Playwright)

```typescript
// tests/e2e/creator-flow.spec.ts
test('creator can create and submit pack', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'creator@test.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Create pack
  await page.goto('/creator/new');
  await page.fill('[name=name]', 'Test Pack');
  await expect(page.locator('[name=slug]')).toHaveValue('test-pack');
  await page.click('button[type=submit]');

  // Upload version
  await page.waitForURL(/\/creator\/packs\/test-pack/);
  // ... upload flow

  // Submit for review
  await page.click('text=Submit for Review');
  await page.fill('[name=notes]', 'Ready for review');
  await page.click('text=Submit');

  // Verify status
  await expect(page.locator('text=Pending Review')).toBeVisible();
});
```

---

## 11. Implementation Phases

### Phase 1: API Client & Core Components (Sprint 1, Week 1)

1. Create `lib/api/client.ts` - typed fetch wrapper
2. Create `lib/api/packs.ts` - pack API functions
3. Create `components/creator/create-pack-form.tsx`
4. Create `components/creator/pack-status-badge.tsx`
5. Update `creator/page.tsx` - already has API integration
6. Create `creator/new/page.tsx` - enhance with real form

### Phase 2: Pack Detail & Version Upload (Sprint 1, Week 1-2)

1. Create `creator/packs/[slug]/page.tsx`
2. Create `components/creator/edit-pack-form.tsx`
3. Create `components/creator/version-upload-form.tsx`
4. Create `components/creator/submission-modal.tsx`
5. Create `components/creator/withdrawal-modal.tsx`

### Phase 3: Public Catalog (Sprint 1, Week 2)

1. Create `components/packs/pack-card.tsx`
2. Create `components/packs/pack-grid.tsx`
3. Create `components/packs/pack-search.tsx`
4. Update `(marketing)/packs/page.tsx` - connect to API
5. Create `(marketing)/packs/[slug]/page.tsx` - pack detail

### Phase 4: Admin Dashboard (Sprint 2)

1. Create `lib/api/admin.ts` - admin API functions
2. Create `components/admin/review-queue-table.tsx`
3. Create `components/admin/review-action-modal.tsx`
4. Create `(dashboard)/admin/reviews/page.tsx`
5. Add admin nav link to dashboard layout

### Phase 5: Polish & Testing (Sprint 2)

1. Add loading skeletons
2. Improve error messages
3. Add toast notifications
4. Write unit tests
5. Write E2E tests
6. Accessibility audit

---

## 12. Dependencies

### 12.1 New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^3.0.0 | Date formatting |
| (none else required) | - | - |

All other dependencies already exist in the project.

### 12.2 Shared Package Usage

Import types and validation schemas from `@loa-constructs/shared`:

```typescript
import type { Pack, PackVersionSummary, SubscriptionTier } from '@loa-constructs/shared';
import { createPackSchema, slugSchema, semverSchema } from '@loa-constructs/shared';
```

---

## 13. File Index

### 13.1 New Files

| Path | Type | Size Est. |
|------|------|-----------|
| `lib/api/client.ts` | API | ~80 LOC |
| `lib/api/packs.ts` | API | ~120 LOC |
| `lib/api/admin.ts` | API | ~50 LOC |
| `components/creator/create-pack-form.tsx` | Component | ~150 LOC |
| `components/creator/edit-pack-form.tsx` | Component | ~120 LOC |
| `components/creator/version-upload-form.tsx` | Component | ~200 LOC |
| `components/creator/submission-modal.tsx` | Component | ~120 LOC |
| `components/creator/withdrawal-modal.tsx` | Component | ~60 LOC |
| `components/creator/pack-status-badge.tsx` | Component | ~40 LOC |
| `components/packs/pack-card.tsx` | Component | ~60 LOC |
| `components/packs/pack-grid.tsx` | Component | ~30 LOC |
| `components/packs/pack-search.tsx` | Component | ~100 LOC |
| `components/admin/review-queue-table.tsx` | Component | ~100 LOC |
| `components/admin/review-action-modal.tsx` | Component | ~120 LOC |
| `app/(dashboard)/creator/packs/[slug]/page.tsx` | Page | ~200 LOC |
| `app/(dashboard)/admin/reviews/page.tsx` | Page | ~100 LOC |
| `app/(marketing)/packs/[slug]/page.tsx` | Page | ~150 LOC |

**Total New Code**: ~1,800 LOC

### 13.2 Modified Files

| Path | Changes |
|------|---------|
| `app/(marketing)/packs/page.tsx` | Replace with API-connected version |
| `app/(dashboard)/creator/new/page.tsx` | Add CreatePackForm |
| `app/(dashboard)/layout.tsx` | Add admin nav (if admin) |

---

**Document Status**: Final - Ready for Implementation
**Next Step**: `/sprint-plan` to break down into tasks

---

> Sources:
> - PRD: loa-grimoire/prd-third-party-ui.md
> - Existing SDD: loa-grimoire/sdd-pack-submission.md
> - Shared types: packages/shared/src/types.ts
> - Shared validation: packages/shared/src/validation.ts
> - Current pages: apps/web/src/app/(dashboard)/creator/page.tsx
> - Current catalog: apps/web/src/app/(marketing)/packs/page.tsx
