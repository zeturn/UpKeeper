import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import MonitorDetail from './pages/MonitorDetail';
import PublicStatusPage from './pages/PublicStatusPage';
import { Routes, Route } from 'react-router-dom';
import { Avatar, Button, Card, Menu } from '@zeturn/watercolor-react';
import { useTheme } from '@zeturn/watercolor-react';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

function ThemeToggle() {
  const { toggleMode, dark } = useTheme();
  return (
    <button
      onClick={toggleMode}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.5rem 1rem',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '0.85rem',
        color: 'var(--wc-text-secondary)',
      }}
    >
      <span style={{ width: 16, textAlign: 'center' }}>{dark ? '☀️' : '🌙'}</span>
      {dark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}

function ProtectedApp() {
  const [user, setUser] = useState<{ id: number, name: string, email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="login-wall">
        <p className="text-muted">Loading UpKeeper…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-wall">
        <Card className="login-card">
          <h1>UpKeeper</h1>
          <p>Login with BasaltPass to manage your URLs</p>
          <Button
            variant="primary"
            fullWidth
            href={`${axios.defaults.baseURL}/api/auth/login`}
            style={{ marginTop: '1.5rem' }}
          >
            Login via BasaltPass
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="absolute-nav">
        <Menu
          trigger="click"
          placement="bottom-end"
          triggerContent={
            <Avatar color="primary" style={{ cursor: 'pointer' }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          }
          menuContent={
            <div style={{ minWidth: 220, padding: '0.5rem 0' }}>
              <div style={{ padding: '0.5rem 1rem 0.75rem' }}>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user.email}</div>
              </div>
              <ThemeToggle />
              <Button
                variant="text"
                fullWidth
                style={{ justifyContent: 'flex-start', color: 'var(--wc-text-error, #dc2626)' }}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          }
        />
      </div>
      <main className="dashboard">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitors/:id" element={<MonitorDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/status/:slug" element={<PublicStatusPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
