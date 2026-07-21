import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@zeturn/watercolor-react';

interface MonitorProps {
  monitor: any;
}

export default function MonitorCard({ monitor }: MonitorProps) {
  const navigate = useNavigate();

  // Format pings for Recharts
  const chartData = [...(monitor.Pings || [])].reverse().map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    latency: p.latency_ms,
    isUp: p.is_up,
  }));

  // Calculate Uptime %
  const total = monitor.Pings?.length || 0;
  const up = monitor.Pings?.filter((p: any) => p.is_up).length || 0;
  const uptimePercent = total > 0 ? ((up / total) * 100).toFixed(2) : '100.00';

  let badgeVariant: 'success' | 'error' | 'warning' = 'warning';
  if (monitor.status === 'up') badgeVariant = 'success';
  if (monitor.status === 'down') badgeVariant = 'error';

  const accent = 'var(--wc-accent, #2563eb)';

  return (
    <Card interactive className="monitor-card" onClick={() => navigate(`/monitors/${monitor.id}`)}>
      <div className="monitor-header">
        <div className="monitor-info">
          <h3>{monitor.name}</h3>
          <p>{monitor.url}</p>
          <p style={{ marginTop: '0.25rem' }}>Uptime: {uptimePercent}%</p>
        </div>
        <Badge variant={badgeVariant}>{monitor.status}</Badge>
      </div>

      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Tooltip
                contentStyle={{ background: 'var(--wc-bg-surface)', border: 'none', borderRadius: '8px', color: 'var(--wc-text-primary)' }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ color: accent }}
              />
              <YAxis hide domain={['dataMin', 'dataMax + 100']} />
              <Area
                type="step"
                dataKey="latency"
                stroke={accent}
                strokeWidth={2}
                fillOpacity={0.12}
                fill={accent}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Waiting for data…</div>
        )}
      </div>
    </Card>
  );
}
