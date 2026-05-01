import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MonitorProps {
  monitor: any;
  onDelete: () => void;
}

export default function MonitorCard({ monitor, onDelete }: MonitorProps) {
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

  let statusClass = 'status-pending';
  if (monitor.status === 'up') statusClass = 'status-up';
  if (monitor.status === 'down') statusClass = 'status-down';

  return (
    <div className="monitor-card" onClick={() => navigate(`/monitors/${monitor.id}`)} style={{cursor: 'pointer'}}>
      <div className="monitor-header">
        <div className="monitor-info">
          <h3>{monitor.name}</h3>
          <p>{monitor.url}</p>
          <p style={{ marginTop: '0.25rem', color: '#cbd5e1' }}>Uptime: {uptimePercent}%</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`status-badge ${statusClass}`}>{monitor.status}</span>
          <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', color: '#fff' }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <YAxis hide domain={['dataMin', 'dataMax + 100']} />
              <Area 
                type="step" 
                dataKey="latency" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={0.15} 
                fill="#3b82f6" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Waiting for data...
          </div>
        )}
      </div>
    </div>
  );
}
