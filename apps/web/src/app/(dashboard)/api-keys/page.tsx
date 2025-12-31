/**
 * API Keys Page
 * @see sprint.md T6.7: API Keys Page - Key management
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  Calendar,
  Shield,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'CI/CD Integration',
    prefix: 'loa_sk_1234',
    scopes: ['read', 'install'],
    createdAt: '2024-11-15',
    expiresAt: null,
    lastUsed: '2024-12-30',
  },
  {
    id: '2',
    name: 'Development',
    prefix: 'loa_sk_5678',
    scopes: ['read', 'write', 'install'],
    createdAt: '2024-12-01',
    expiresAt: '2025-12-01',
    lastUsed: '2024-12-28',
  },
  {
    id: '3',
    name: 'Testing',
    prefix: 'loa_sk_9012',
    scopes: ['read'],
    createdAt: '2024-12-20',
    expiresAt: '2025-03-20',
    lastUsed: null,
  },
];

const availableScopes = [
  { id: 'read', name: 'Read', description: 'Read skills and account info' },
  { id: 'write', name: 'Write', description: 'Create and update skills' },
  { id: 'install', name: 'Install', description: 'Install and uninstall skills' },
  { id: 'admin', name: 'Admin', description: 'Full account access' },
];

const expiryOptions = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never expires' },
];

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  expiry: z.string(),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
});

type CreateKeyFormData = z.infer<typeof createKeySchema>;

function CreateKeyDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateKeyFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateKeyFormData>({
    resolver: zodResolver(createKeySchema),
    defaultValues: {
      name: '',
      expiry: '90',
      scopes: ['read'],
    },
  });

  const selectedScopes = watch('scopes');

  const toggleScope = (scopeId: string) => {
    const current = selectedScopes || [];
    if (current.includes(scopeId)) {
      setValue(
        'scopes',
        current.filter((s) => s !== scopeId)
      );
    } else {
      setValue('scopes', [...current, scopeId]);
    }
  };

  const onSubmit = (data: CreateKeyFormData) => {
    onCreate(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create API Key</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="key-name">Key Name</Label>
            <Input
              id="key-name"
              {...register('name')}
              placeholder="e.g., CI/CD Integration"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="space-y-2">
              {availableScopes.map((scope) => (
                <label
                  key={scope.id}
                  className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedScopes?.includes(scope.id)}
                    onCheckedChange={() => toggleScope(scope.id)}
                  />
                  <div>
                    <p className="font-medium text-sm">{scope.name}</p>
                    <p className="text-xs text-muted-foreground">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.scopes && (
              <p className="text-sm text-destructive">{errors.scopes.message}</p>
            )}
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiration</Label>
            <select
              id="expiry"
              {...register('expiry')}
              className="w-full h-10 px-3 border rounded-md bg-background"
            >
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Key
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewKeyDisplay({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-green-600">
            <Check className="h-6 w-6" />
            <h2 className="text-lg font-semibold">API Key Created</h2>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Save this key now
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You won&apos;t be able to see it again after closing this dialog.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={visible ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={onClose}>
            I&apos;ve saved the key
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateKey = (data: CreateKeyFormData) => {
    // In production, this would call the API
    const generatedKey = `loa_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    const expiresAt =
      data.expiry === 'never'
        ? null
        : new Date(Date.now() + parseInt(data.expiry) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

    const newApiKey: ApiKey = {
      id: Math.random().toString(),
      name: data.name,
      prefix: generatedKey.substring(0, 12),
      scopes: data.scopes,
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt,
      lastUsed: null,
    };

    setKeys([newApiKey, ...keys]);
    setIsCreateOpen(false);
    setNewKey(generatedKey);
  };

  const handleDeleteKey = (keyId: string) => {
    setKeys(keys.filter((k) => k.id !== keyId));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for CLI and integrations</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Keep your API keys secure</p>
              <p className="text-xs text-muted-foreground">
                Never share your API keys in public repositories or client-side code. Use
                environment variables to store them securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            {keys.length} key{keys.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm">Create one to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{key.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {key.prefix}...
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-0.5 text-xs bg-muted rounded-full capitalize"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {key.createdAt}
                      </p>
                      {key.expiresAt && (
                        <p
                          className={cn(
                            new Date(key.expiresAt) < new Date() && 'text-destructive'
                          )}
                        >
                          {new Date(key.expiresAt) < new Date()
                            ? 'Expired'
                            : `Expires ${key.expiresAt}`}
                        </p>
                      )}
                      {key.lastUsed && <p>Last used {key.lastUsed}</p>}
                    </div>
                    <div className="relative">
                      {deleteConfirm === key.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <CreateKeyDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateKey}
      />

      {/* New Key Display */}
      {newKey && <NewKeyDisplay apiKey={newKey} onClose={() => setNewKey(null)} />}
    </div>
  );
}
