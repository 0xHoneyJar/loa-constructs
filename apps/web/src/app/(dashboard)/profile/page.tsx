/**
 * Profile Page (TUI Style)
 * @see sprint.md T20.4: Redesign Profile Page
 */

'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiInput } from '@/components/tui/tui-input';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH1, TuiDim, TuiSuccess } from '@/components/tui/tui-text';
import { useAuth } from '@/contexts/auth-context';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsProfileSaving(true);
    setProfileSaved(false);

    // In production, this would call the API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Profile data:', data);
    setIsProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsPasswordSaving(true);
    setPasswordChanged(false);

    // In production, this would call the API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Password change:', data);
    setIsPasswordSaving(false);
    setPasswordChanged(true);
    resetPassword();
    setTimeout(() => setPasswordChanged(false), 3000);
  };

  const avatarInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ padding: '0 4px' }}>
        <TuiH1 cursor>Profile Settings</TuiH1>
        <TuiDim>Manage your account details</TuiDim>
      </div>

      {/* Profile Information */}
      <TuiBox title="Profile Information">
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              style={{
                width: '64px',
                height: '64px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '24px', color: 'var(--accent)' }}>{avatarInitial}</span>
              )}
            </button>
            <div>
              <div style={{ color: 'var(--fg)' }}>Click to upload avatar</div>
              <TuiDim>JPG, PNG, GIF up to 5MB</TuiDim>
            </div>
          </div>

          {/* Name */}
          <TuiInput
            label="Display Name"
            type="text"
            placeholder="Your name"
            error={profileErrors.name?.message}
            {...registerProfile('name')}
          />

          {/* Email (read-only) */}
          <div>
            <div style={{ marginBottom: '4px' }}>
              <TuiDim style={{ fontSize: '12px' }}>Email Address</TuiDim>
            </div>
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--fg-dim)',
                fontFamily: 'inherit',
              }}
            >
              {user?.email || 'user@example.com'}
            </div>
            <TuiDim style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Email cannot be changed. Contact support if needed.
            </TuiDim>
          </div>

          {profileSaved && (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--green)',
                background: 'rgba(80, 250, 123, 0.1)',
              }}
            >
              <TuiSuccess>✓ Profile saved successfully</TuiSuccess>
            </div>
          )}

          <TuiButton type="submit" disabled={isProfileSaving}>
            {isProfileSaving ? 'Saving...' : profileSaved ? '✓ Saved' : '$ save-profile'}
          </TuiButton>
        </form>
      </TuiBox>

      {/* Password Change */}
      <TuiBox title="Change Password">
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TuiInput
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword('currentPassword')}
          />

          <TuiInput
            label="New Password"
            type="password"
            placeholder="Enter new password"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            hint="Min 8 chars with uppercase, lowercase, and number"
            {...registerPassword('newPassword')}
          />

          <TuiInput
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword('confirmPassword')}
          />

          {passwordChanged && (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--green)',
                background: 'rgba(80, 250, 123, 0.1)',
              }}
            >
              <TuiSuccess>✓ Password changed successfully</TuiSuccess>
            </div>
          )}

          <TuiButton type="submit" variant="secondary" disabled={isPasswordSaving}>
            {isPasswordSaving ? 'Changing...' : '$ change-password'}
          </TuiButton>
        </form>
      </TuiBox>

      {/* Account Information */}
      <TuiBox title="Account Information">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <TuiDim>Account Created</TuiDim>
            <span style={{ color: 'var(--fg-bright)' }}>December 1, 2024</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <TuiDim>Current Plan</TuiDim>
            <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>
              {user?.role || 'Free'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <TuiDim>Email Verified</TuiDim>
            <span style={{ color: user?.emailVerified ? 'var(--green)' : 'var(--yellow)' }}>
              {user?.emailVerified ? 'Yes' : 'No'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
            }}
          >
            <TuiDim>User ID</TuiDim>
            <span style={{ color: 'var(--fg-dim)', fontFamily: 'monospace', fontSize: '12px' }}>
              {user?.id || 'usr_xxxxx'}
            </span>
          </div>
        </div>
      </TuiBox>

      {/* Danger Zone */}
      <TuiBox title="Danger Zone" variant="danger">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TuiDim>
            Once you delete your account, there is no going back. All your data, API keys, and
            installed skills will be permanently removed.
          </TuiDim>
          <TuiButton
            variant="danger"
            onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Account deletion not implemented');
              }
            }}
          >
            $ delete-account --force
          </TuiButton>
        </div>
      </TuiBox>
    </div>
  );
}
