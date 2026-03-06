'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/lib/api/hooks';

const periods = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = useAnalytics(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono text-bone-bright">Analytics</h1>
          <p className="text-xs font-mono text-bone-muted mt-1">Usage analytics for your constructs.</p>
        </div>
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'secondary'}
              onClick={() => setPeriod(p.value)}
              className="text-[10px] px-2 py-1 h-auto"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel title="Total Installs">
          <p className="text-2xl font-mono text-cyan-base">
            {isLoading ? '—' : (data?.totalInstalls ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Total Loads">
          <p className="text-2xl font-mono text-cyan-dim">
            {isLoading ? '—' : (data?.totalLoads ?? 0).toLocaleString()}
          </p>
        </Panel>
        <Panel title="Skills Used">
          <p className="text-2xl font-mono text-bone-base">
            {isLoading ? '—' : data?.skillsUsed ?? 0}
          </p>
        </Panel>
      </div>

      {/* Trend Chart */}
      <Panel title="Usage Trend">
        {isLoading ? (
          <p className="text-xs font-mono text-bone-muted">Loading trend...</p>
        ) : !data?.trend?.length ? (
          <p className="text-xs font-mono text-bone-muted">No usage data yet.</p>
        ) : (
          <div className="flex items-end gap-px h-40">
            {data.trend.map((day, i) => {
              const max = Math.max(...data.trend.map((d) => d.installs + d.loads), 1);
              const installH = (day.installs / max) * 100;
              const loadH = (day.loads / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end"
                  title={`${day.date}: ${day.installs} installs, ${day.loads} loads`}
                >
                  <div
                    className="bg-cyan-base/60"
                    style={{ height: `${Math.max(loadH, 1)}%` }}
                  />
                  <div
                    className="bg-cyan-dim/60"
                    style={{ height: `${Math.max(installH, 1)}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-4 mt-2 text-[10px] font-mono text-bone-muted">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-cyan-dim/60 inline-block" /> installs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-cyan-base/60 inline-block" /> loads
          </span>
        </div>
      </Panel>

      {/* Skill Breakdown */}
      <Panel title="Skill Breakdown">
        {isLoading ? (
          <p className="text-xs font-mono text-bone-muted">Loading...</p>
        ) : !data?.skillBreakdown?.length ? (
          <p className="text-xs font-mono text-bone-muted">No skill data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-void-border">
                  <th className="text-left py-2 px-2 text-bone-muted">Skill</th>
                  <th className="text-right py-2 px-2 text-bone-muted">Installs</th>
                  <th className="text-right py-2 px-2 text-bone-muted">Loads</th>
                  <th className="text-right py-2 px-2 text-bone-muted">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {data.skillBreakdown.map((skill) => (
                  <tr key={skill.name} className="border-b border-void-border/50">
                    <td className="py-2 px-2 text-bone-base">{skill.name}</td>
                    <td className="text-right py-2 px-2 text-bone-base">{skill.installs.toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-bone-base">{skill.loads.toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-bone-muted">
                      {skill.lastUsed ? new Date(skill.lastUsed).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
