import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MonitorCard from '../components/MonitorCard';
import { Plus, Activity } from 'lucide-react';
import { Button, Modal, Input, Checkbox } from '@zeturn/watercolor-react';

interface Monitor {
  id: number;
  name: string;
  url: string;
  interval: number;
  status: string;
  last_check: string;
  Pings?: any[];
}

// ─── Add Monitor Modal (isolated state to prevent parent re-render) ──────
function AddMonitorModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, is_public: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setFormData({ name: '', url: '', interval: 60, is_public: false });
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/monitors', formData);
      onClose();
      onSaved();
    } catch {
      alert('Failed to save monitor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add New Monitor"
      onClose={onClose}
      footer={
        <div className="form-actions">
          <Button variant="secondary" buttonStyle="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>Save Monitor</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="form-stack">
        <Input
          label="Friendly Name"
          required fullWidth
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="My Website"
        />
        <Input
          label="Target URL"
          type="url" required fullWidth
          value={formData.url}
          onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://example.com"
        />
        <Input
          label="Check Interval (seconds)"
          type="number" required min={10} fullWidth
          value={formData.interval}
          onChange={e => setFormData(prev => ({ ...prev, interval: Number(e.target.value) }))}
        />
        <Checkbox
          label="Generate Public Status Page"
          checked={formData.is_public}
          onChange={e => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
        />
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showModal, setShowModal] = useState(false);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await axios.get('/api/monitors');
      setMonitors(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (showModal) return;
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 5000);
    return () => clearInterval(interval);
  }, [showModal, fetchMonitors]);

  return (
    <div>
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          <Activity size={24} /> UpKeeper Monitors
        </h2>
        <Button variant="primary" startIcon={<Plus size={18} />} onClick={() => setShowModal(true)}>
          Add Monitor
        </Button>
      </div>

      <div className="monitors-grid">
        {monitors.map(m => (
          <MonitorCard key={m.id} monitor={m} />
        ))}
      </div>

      <AddMonitorModal open={showModal} onClose={() => setShowModal(false)} onSaved={fetchMonitors} />
    </div>
  );
}
