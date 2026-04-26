import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Bell, Pause, Play, Settings, MoreVertical, Shield } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function MonitorDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, is_public: false });
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await axios.get(`/api/monitors/${id}/details`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (showEditModal) return;
    fetchDetail();
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [fetchDetail, showEditModal]);

  const handleTestNotification = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      } else {
        new Notification("Test Notification", { body: "Your notification system is working perfectly!" });
      }
    }
    alert("Test notification triggered! (Browser notification should appear if permitted)");
  };

  const handleTogglePause = async () => {
    try {
      await axios.put(`/api/monitors/${id}/pause`);
      fetchDetail();
    } catch (err) {
      alert("Failed to toggle pause");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/monitors/${id}`, formData);
      setShowEditModal(false);
      fetchDetail();
    } catch (err) {
      alert("Failed to update monitor");
    }
  };

  const openEditModal = () => {
    if (data?.monitor) {
      setFormData({
        name: data.monitor.name,
        url: data.monitor.url,
        interval: data.monitor.interval,
        is_public: data.monitor.is_public || false
      });
    }
    setShowEditModal(true);
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Loading details...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Monitor not found.</div>;
  }

  const { monitor, uptime_24h, uptime_7d, uptime_30d, uptime_365d, recent_pings } = data;

  const chartData = (recent_pings || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    latency: p.latency_ms,
    isUp: p.is_up,
  }));

  const formatRelativeTime = (dateStr: string) => {
    let diff = Math.floor((nowTs - new Date(dateStr).getTime()) / 1000);
    if (diff < 0) diff = 0; // prevent negative elapsed
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--/--/----';
    return new Date(dateStr).toLocaleDateString();
  };

  // Generate blocks for 24h visualization (max 40 visual blocks)
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
    <div className="monitor-detail">
      <div className="detail-navigation">
        <Link to="/" className="back-link">
          <ChevronLeft size={16} /> Monitoring
        </Link>
      </div>

      <div className="detail-header">
        <div className="title-section">
          <div className={`status-circle ${monitor.status === 'up' ? 'up' : 'down'}`} style={monitor.status === 'paused' ? {borderColor: '#94a3b8', color: '#94a3b8', background: 'transparent'} : {}}>
            {monitor.status === 'paused' ? <span className="inner-arrow" style={{background: '#94a3b8'}}>❚ ❚</span> : <span className="inner-arrow">{monitor.status === 'up' ? '▲' : '▼'}</span>}
          </div>
          <div>
            <h2>{monitor.name} {monitor.status === 'paused' && <span style={{fontSize: '1rem', fontWeight: 400, color: '#fbbf24'}}>(Paused)</span>}</h2>
            <p className="subtitle">HTTP/S monitor for {monitor.url}</p>
            <div className="tags">
              <span className="tag">Client 1</span>
              <span className="tag">Server Europe</span>
            </div>
          </div>
        </div>
        <div className="action-buttons">
          {monitor.is_public && (
            <a href={`/status/${monitor.public_slug}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{color: '#34d399', borderColor: '#34d399', textDecoration: 'none'}}>
              <Shield size={14}/> Public Status Page
            </a>
          )}
          <button className="btn-secondary" onClick={handleTestNotification}><Bell size={14}/> Test notification</button>
          <button className="btn-secondary" onClick={handleTogglePause}>
            {monitor.status === 'paused' ? <Play size={14}/> : <Pause size={14}/>} 
            {monitor.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button className="btn-secondary" onClick={openEditModal}><Settings size={14}/> Edit</button>
          <button className="btn-icon"><MoreVertical size={16}/></button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="widget-card">
          <h4 className="widget-title">Current status</h4>
          <div className={`widget-value ${monitor.status === 'paused' ? 'text-muted' : monitor.status === 'up' ? 'text-green' : 'text-red'}`}>
            {monitor.status === 'paused' ? 'Paused' : monitor.status === 'up' ? 'Up' : 'Down'}
          </div>
          <p className="widget-desc">Tracking active checks</p>
        </div>

        <div className="widget-card">
          <h4 className="widget-title">Last check</h4>
          <div className="widget-value text-white">{formatRelativeTime(monitor.last_check)}</div>
          <p className="widget-desc">Checked every {monitor.interval} s</p>
        </div>

        <div className="widget-card col-span-2">
          <div className="flex-between">
             <h4 className="widget-title">Last {monitor.interval >= 3600 ? '24 hours' : (monitor.interval * totalBlocks >= 3600 ? 'Recent' : 'Timeline')}</h4>
             <span className="widget-title">{uptime_24h.uptime_pct}</span>
          </div>
          <div className="uptime-blocks">
            {blocks.map((status, idx) => (
              <div key={idx} className={`uptime-block block-${status}`} />
            ))}
          </div>
          <p className="widget-desc">Recent checks timeline view</p>
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
          <h4 className="widget-title">Domain & SSL cert.</h4>
          <div className="cert-info">
            <p className="stat-label">SSL valid until</p>
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Monitor</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Friendly Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="My Website" />
              </div>
              <div className="form-group">
                <label>Target URL</label>
                <input type="url" required value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com" />
              </div>
              <div className="form-group">
                <label>Check Interval (seconds)</label>
                <input type="number" required min="10" value={formData.interval} onChange={e => setFormData({ ...formData, interval: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="public_check_detail" style={{ width: 'auto', outline: 'none' }} checked={formData.is_public} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} />
                <label htmlFor="public_check_detail" style={{ margin: 0, cursor: 'pointer' }}>Require Public Viewer Status Page</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Update Monitor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
