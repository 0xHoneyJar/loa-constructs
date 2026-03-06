'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { useTeams, useCreateTeam } from '@/lib/api/hooks';

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    await createTeam.mutateAsync(teamName);
    setTeamName('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono text-bone-bright">Teams</h1>
          <p className="text-xs font-mono text-bone-muted mt-1">Manage your team memberships.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Team'}
        </Button>
      </div>

      {showCreate && (
        <Panel title="Create Team">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <FormInput
                label="Team Name"
                placeholder="e.g., my-team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createTeam.isPending || !teamName.trim()}>
              {createTeam.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
          {createTeam.isError && (
            <p className="text-xs font-mono text-crimson-base mt-2">
              {createTeam.error?.message || 'Failed to create team.'}
            </p>
          )}
        </Panel>
      )}

      <Panel title="Your Teams">
        {isLoading ? (
          <p className="text-xs font-mono text-bone-muted">Loading teams...</p>
        ) : !teams?.length ? (
          <div className="py-8 text-center">
            <p className="text-sm font-mono text-bone-muted mb-4">No teams yet.</p>
            <Button variant="secondary" onClick={() => setShowCreate(true)}>
              Create Your First Team
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="flex items-center justify-between border border-void-border px-3 py-2 hover:border-cyan-base transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 border border-void-border flex items-center justify-center text-sm font-mono text-cyan-base">
                    {team.name[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-mono text-bone-base">{team.name}</p>
                    <p className="text-[10px] font-mono text-bone-muted">/{team.slug}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-bone-muted">→</span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
