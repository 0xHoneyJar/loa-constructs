'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { useProfile, useUpdateProfile } from '@/lib/api/hooks';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', avatarUrl: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name || '', avatarUrl: profile.avatarUrl || '' });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate({
      name: data.name,
      avatarUrl: data.avatarUrl || undefined,
    });
  };

  if (isLoading) {
    return <p className="text-sm font-mono text-bone-muted">Loading profile...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-mono text-bone-bright">Profile</h1>
        <p className="text-xs font-mono text-bone-muted mt-1">Manage your account settings.</p>
      </div>

      <Panel title="Account Info">
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-bone-muted">Email</span>
            <span className="text-bone-base">{profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bone-muted">Role</span>
            <span className="text-cyan-base uppercase">{profile?.role || 'free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-bone-muted">Member since</span>
            <span className="text-bone-base">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </Panel>

      <Panel title="Edit Profile">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormInput
            label="Display Name"
            error={errors.name?.message}
            {...register('name')}
          />
          <FormInput
            label="Avatar URL"
            type="url"
            placeholder="https://example.com/avatar.png"
            error={errors.avatarUrl?.message}
            hint="Direct link to an image"
            {...register('avatarUrl')}
          />

          {updateProfile.isSuccess && (
            <p className="text-xs font-mono text-cyan-base">Profile updated successfully.</p>
          )}
          {updateProfile.isError && (
            <p className="text-xs font-mono text-crimson-base">
              {updateProfile.error?.message || 'Failed to update profile.'}
            </p>
          )}

          <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
