import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { ChevronLeft, Bell, Pause, Play, Settings, Shield, ArrowUp, ArrowDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Button, Card, Modal, Input, Checkbox } from '@zeturn/watercolor-react';

// ─── Edit Monitor Modal (memoized, stable props) ────────────────────────
const EditMonitorModal = memo(function EditMonitorModal({ open, onClose, onSaved, monitor, monitorId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  monitor: { name: string; url: string; interval: number; is_public?: boolean } | null;
  monitorId: number;
}) {
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, is_public: false });
  const [saving, setSaving] = useState(false);
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (open && monitor && !initDoneRef.current) {
      initDoneRef.current = true;
      setFormData({ name: monitor.name || '', url: monitor.url || '', interval: monitor.interval || 60, is_public: monitor.is_public || false });
    }
    if (!open) initDoneRef.current = false;
  }, [open, monitor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await axios.put(`/api/monitors/${monitorId}`, formData); onClose(); onSaved(); }
    catch { alert('Failed to update monitor'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} title="Edit Monitor" onClose={onClose}
      footer={<div className="form-actions">
        <Button variant="secondary" buttonStyle="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>Update Monitor</Button>
      </div>}>
      <form onSubmit={handleSubmit} className="form-stack">
        <Input label="Friendly Name" required fullWidth autoFocus value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="My Website" />
        <Input label="Target URL" type="url" required fullWidth value={formData.url}
          onChange={e => setFormData(p => ({ ...p, url: e.target.value }))} placeholder="https://example.com" />
        <Input label="Check Interval (seconds)" type="number" required min={10} fullWidth value={formData.interval}
          onChange={e => setFormData(p => ({ ...p, interval: Number(e.target.value) }))} />
        <Checkbox label="Require Public Viewer Status Page" checked={formData.is_public}
          onChange={e => setFormData(p => ({ ...p, is_public: e.target.checked }))} />
      </form>
    </Modal>
  );
});

export default function MonitorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const editSnapshotRef = useRef<{ name: string; url: string; interval: number; is_public?: boolean } | null>(null);
  // 稳定的 onClose 回调，避免每次渲染创建新引用导致 memo 失效
  const handleCloseEditModal = useCallback(() => setShowEditModal(false), []);

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
    const refreshWhenVisible = () => {
      if (!document.hidden) fetchDetail();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchDetail, showEditModal]);

  const handleTestNotification = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      } else {
        new Notification("Test Notification", { body: "Your notification system is working perfectly." });
      }
    }
    alert("Test notification triggered. (Browser notification should appear if permitted)");
  };

  const handleTogglePause = async () => {
    try {
      await axios.put(`/api/monitors/${id}/pause`);
      fetchDetail();
    } catch (err) {
      alert("Failed to toggle pause");
    }
  };

  const openEditModal = () => {
    editSnapshotRef.current = data?.monitor ?? null;
    setShowEditModal(true);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}><p className="text-muted">Loading details…</p></div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem' }}><p className="text-muted">Monitor not found.</p></div>;
  }

  const { monitor, uptime_24h, uptime_7d, uptime_30d, uptime_365d, recent_pings } = data;

  const chartData = (recent_pings || []).map((p: any) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    latency: p.latency_ms,
    isUp: p.is_up,
  }));

  const formatRelativeTime = (dateStr: string) => {
    let diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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

  const statusKey = monitor.status === 'paused' ? 'paused' : monitor.status === 'up' ? 'up' : 'down';
  const accent = 'var(--wc-accent, #2563eb)';

  return (
    <div className="monitor-detail">
      <div className="detail-navigation">
        <Button variant="text" startIcon={<ChevronLeft size={16} />} onClick={() => navigate('/')}>
          Monitoring
        </Button>
      </div>

      <Card className="detail-header">
        <div className="title-section">
          <div className={`status-circle ${statusKey}`}>
            {statusKey === 'paused' ? <Pause size={20} /> : statusKey === 'up' ? <ArrowUp size={22} /> : <ArrowDown size={22} />}
          </div>
          <div>
            <h2>
              {monitor.name}
              {monitor.status === 'paused' && <span className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>(Paused)</span>}
            </h2>
            <p className="subtitle">HTTP/S monitor for {monitor.url}</p>

          </div>
        </div>
        <div className="action-buttons">
          {monitor.is_public && (
            <Button href={`/status/${monitor.public_slug}`} target="_blank" variant="success" buttonStyle="outlined" size="sm" startIcon={<Shield size={14} />}>
              Public Status Page
            </Button>
          )}
          <Button variant="secondary" buttonStyle="outlined" size="sm" startIcon={<Bell size={14} />} onClick={handleTestNotification}>
            Test notification
          </Button>
          <Button variant="secondary" buttonStyle="outlined" size="sm" startIcon={monitor.status === 'paused' ? <Play size={14} /> : <Pause size={14} />} onClick={handleTogglePause}>
            {monitor.status === 'paused' ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="secondary" buttonStyle="outlined" size="sm" startIcon={<Settings size={14} />} onClick={openEditModal}>
            Edit
          </Button>
        </div>
      </Card>

      <div className="detail-grid">
        <Card className="widget-card">
          <h4 className="widget-title">Current status</h4>
          <div className={`widget-value ${monitor.status === 'paused' ? 'text-muted' : monitor.status === 'up' ? 'text-green' : 'text-red'}`}>
            {monitor.status === 'paused' ? 'Paused' : monitor.status === 'up' ? 'Up' : 'Down'}
          </div>
          <p className="widget-desc">Tracking active checks</p>
        </Card>

        <Card className="widget-card">
          <h4 className="widget-title">Last check</h4>
          <div className="widget-value">{formatRelativeTime(monitor.last_check)}</div>
          <p className="widget-desc">Checked every {monitor.interval} s</p>
        </Card>

        <Card className="widget-card col-span-2">
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
        </Card>

        <Card className="widget-card col-span-3">
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
        </Card>

        <Card className="widget-card">
          <h4 className="widget-title">Domain & SSL cert.</h4>
          <div className="cert-info">
            <p className="stat-label">SSL valid until</p>
            <p className="cert-date"><Shield size={14} /> {formatDate(monitor.ssl_expiry)}</p>
          </div>
        </Card>
      </div>

      <Card className="chart-widget widget-card mt-4">
         <div className="flex-between mb-4">
           <h4 className="widget-title">Response time</h4>
           <span className="stat-label">Realtime View</span>
         </div>
         <div className="chart-wrapper" style={{ height: '240px' }}>
         {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <YAxis tick={{ fill: 'var(--wc-text-tertiary, #9aa5b1)' }} axisLine={false} tickLine={false} domain={['dataMin', 'dataMax + 50']} />
              <XAxis dataKey="time" hide />
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
           <p className="widget-desc text-center mt-8">Waiting for data…</p>
         )}
         </div>
      </Card>

      {createPortal(
        <EditMonitorModal
          open={showEditModal}
          onClose={handleCloseEditModal}
          onSaved={fetchDetail}
          monitor={editSnapshotRef.current}
          monitorId={Number(id)}
        />,
        document.body
      )}
    </div>
  );
}
