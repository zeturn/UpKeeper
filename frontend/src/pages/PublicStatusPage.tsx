import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function PublicStatusPage() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await axios.get(`/api/public/status/${slug}`);
      setData(res.data);
      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  if (loading) {
    return <div className="login-wall" style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 600 }}>Loading Status...</div>;
  }

  if (error || !data) {
    return (
      <div className="login-wall">
        <div className="login-card">
          <h1>404 Not Found</h1>
          <p>This status page doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  const { monitor, uptime_24h, uptime_7d, uptime_30d, uptime_365d, recent_pings } = data;

  const chartData = (recent_pings || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    latency: p.latency_ms,
    isUp: p.is_up,
  }));

  const formatRelativeTime = (dateStr: string) => {
    let diff = Math.floor((nowTs - new Date(dateStr).getTime()) / 1000);
    if (diff < 0) diff = 0;
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--/--/----';
    return new Date(dateStr).toLocaleDateString();
  };

  const blocks = [];
  const totalBlocks = 40;
  const pingsCount = recent_pings.length;
  
  for (let i = 0; i < totalBlocks; i++) {
    const pingIdx = pingsCount - totalBlocks + i;
    if (pingIdx >= 0 && pingIdx < pingsCount) {
      blocks.push(recent_pings[pingIdx].is_up ? 'up' : 'down');
    } else {
      blocks.push('none');
    }
  }

  return (
    <div className="app-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="detail-header" style={{ marginTop: '2rem' }}>
        <div className="title-section">
          <div className={`status-circle ${monitor.status === 'up' ? 'up' : 'down'}`} style={monitor.status === 'paused' ? {borderColor: '#94a3b8', color: '#94a3b8', background: 'transparent'} : {}}>
            {monitor.status === 'paused' ? <span className="inner-arrow" style={{background: '#94a3b8'}}>❚ ❚</span> : <span className="inner-arrow">{monitor.status === 'up' ? '▲' : '▼'}</span>}
          </div>
          <div>
            <h2>{monitor.name}</h2>
            <p className="subtitle">Public Status Page for {monitor.url}</p>
          </div>
        </div>
        <div className="action-buttons">
          <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
            <Activity color="#3b82f6" size={16}/> Powered by UpKeeper
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <div className="widget-card">
          <h4 className="widget-title">Current status</h4>
          <div className={`widget-value ${monitor.status === 'paused' ? 'text-muted' : monitor.status === 'up' ? 'text-green' : 'text-red'}`}>
            {monitor.status === 'paused' ? 'Paused' : monitor.status === 'up' ? 'All systems operational' : 'Major Outage'}
          </div>
          <p className="widget-desc">Live tracker</p>
        </div>

        <div className="widget-card">
          <h4 className="widget-title">Last check</h4>
          <div className="widget-value text-white">{formatRelativeTime(monitor.last_check)}</div>
          <p className="widget-desc">Checked periodically</p>
        </div>

        <div className="widget-card col-span-2">
          <div className="flex-between">
             <h4 className="widget-title">Recent Timeline</h4>
             <span className="widget-title">{uptime_24h.uptime_pct}</span>
          </div>
          <div className="uptime-blocks">
            {blocks.map((status, idx) => (
              <div key={idx} className={`uptime-block block-${status}`} />
            ))}
          </div>
          <p className="widget-desc">Service continuity view</p>
        </div>

        <div className="widget-card col-span-3">
          <h4 className="widget-title">Uptime stats.</h4>
          <div className="stats-row">
            <div>
              <p className="stat-label">Last 7 days</p>
              <h3 className="stat-value text-blue">{uptime_7d.uptime_pct}</h3>
            </div>
            <div>
              <p className="stat-label">Last 30 days</p>
              <h3 className="stat-value text-blue">{uptime_30d.uptime_pct}</h3>
            </div>
            <div>
              <p className="stat-label">Last 365 days</p>
              <h3 className="stat-value text-muted">{uptime_365d.uptime_pct}</h3>
            </div>
          </div>
        </div>

        <div className="widget-card">
          <h4 className="widget-title">SSL / Security</h4>
          <div className="cert-info">
            <p className="stat-label">Cert valid until</p>
            <p className="cert-date text-white"><Shield size={14}/> {formatDate(monitor.ssl_expiry)}</p>
          </div>
        </div>
      </div>

      <div className="chart-widget widget-card mt-4">
         <div className="flex-between mb-4">
           <h4 className="widget-title">Response time</h4>
           <span className="stat-label">Realtime View</span>
         </div>
         <div className="chart-wrapper" style={{ height: '240px' }}>
         {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <YAxis tick={{fill: '#475569'}} axisLine={false} tickLine={false} domain={['dataMin', 'dataMax + 50']} />
              <XAxis dataKey="time" hide />
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
           <p className="widget-desc text-center mt-8">Waiting for data...</p>
         )}
         </div>
      </div>
    </div>
  );
}
