import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import MonitorDetail from './pages/MonitorDetail';
import PublicStatusPage from './pages/PublicStatusPage';
import { Routes, Route } from 'react-router-dom';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

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

  const [showMenu, setShowMenu] = useState(false);

  if (loading) {
    return <div className="login-wall" style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 600 }}>Loading UpKeeper...</div>;
  }

  if (!user) {
    return (
      <div className="login-wall">
        <div className="login-card">
          <h1>UpKeeper</h1>
          <p>Login with BasaltPass to manage your URLs</p>
          <a href={`${axios.defaults.baseURL}/api/auth/login`} className="login-btn">
            Login via BasaltPass
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="absolute-nav">
        <div className="avatar-wrapper">
          <div className="avatar" onClick={() => setShowMenu(!showMenu)}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {showMenu && (
            <>
              <div className="dropdown-overlay" onClick={() => setShowMenu(false)} />
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                </div>
                <button className="dropdown-item text-red" onClick={handleLogout}>Logout</button>
              </div>
            </>
          )}
        </div>
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
