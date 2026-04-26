import { useState, useEffect } from 'react';
import axios from 'axios';
import MonitorCard from '../components/MonitorCard';
import { Plus, Activity } from 'lucide-react';

interface Monitor {
  id: number;
  name: string;
  url: string;
  interval: number;
  status: string;
  last_check: string;
  Pings?: any[];
}

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', interval: 60, is_public: false });

  const fetchMonitors = async () => {
    try {
      const res = await axios.get('/api/monitors');
      setMonitors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showModal) return; // Pause polling when modal is open
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 5000);
    return () => clearInterval(interval);
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/monitors', formData);
      setShowModal(false);
      setFormData({ name: '', url: '', interval: 60, is_public: false });
      fetchMonitors();
    } catch (err) {
      alert("Failed to save monitor");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure?")) {
      await axios.delete(`/api/monitors/${id}`);
      fetchMonitors();
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
          <Activity size={28} /> UpKeeper Monitors
        </h2>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Add Monitor
        </button>
      </div>

      <div className="monitors-grid">
        {monitors.map(m => (
          <MonitorCard key={m.id} monitor={m} onDelete={() => handleDelete(m.id)} />
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add New Monitor</h2>
            <form onSubmit={handleSubmit}>
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
                <input type="checkbox" id="public_check" style={{ width: 'auto', outline: 'none' }} checked={formData.is_public} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} />
                <label htmlFor="public_check" style={{ margin: 0, cursor: 'pointer' }}>Generate Public Status Page</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save Monitor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
