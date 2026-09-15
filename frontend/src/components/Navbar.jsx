import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [panelPendingCount, setPanelPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      client.get('/auth/notifications')
        .then(res => setNotifications(res.data))
        .catch(() => {});

      if (user.role === 'supervisor' || user.role === 'panel') {
        client.get('/projects/panel-assigned')
          .then(res => {
            const projects = res.data || [];
            const pending = projects.filter(p => !p.evaluated_at);
            setPanelPendingCount(pending.length);
          })
          .catch(() => {});
      }
    }
  }, [user, location.pathname]);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function markRead(id) {
    try {
      await client.patch(`/auth/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {}
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <div className="brand-title">APSES</div>
            <span className="brand-subtitle">Faculty of Computing, ATBU Bauchi</span>
          </div>
        </div>

        {(user.role === 'supervisor' || user.role === 'panel') && (
          <nav className="nav-tabs-supervisor" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              to="/supervisor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.42rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: location.pathname === '/supervisor' ? '600' : '500',
                textDecoration: 'none',
                background: location.pathname === '/supervisor' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                color: location.pathname === '/supervisor' ? '#ffffff' : 'var(--text-secondary)',
                border: location.pathname === '/supervisor' ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>👥</span> My Supervisees
            </Link>
            <Link
              to="/panel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.42rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: location.pathname === '/panel' ? '600' : '500',
                textDecoration: 'none',
                background: location.pathname === '/panel' ? '#b45309' : 'var(--bg-subtle)',
                color: location.pathname === '/panel' ? '#ffffff' : 'var(--text-secondary)',
                border: location.pathname === '/panel' ? '1px solid #b45309' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>⚖️</span> Defense Panels
              {panelPendingCount > 0 && (
                <span style={{
                  background: location.pathname === '/panel' ? '#ffffff' : '#f59e0b',
                  color: location.pathname === '/panel' ? '#b45309' : '#ffffff',
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  marginLeft: '0.2rem'
                }}>
                  {panelPendingCount}
                </span>
              )}
            </Link>
          </nav>
        )}

        <div className="nav-user">
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowNotifs(!showNotifs)}
              style={{ position: 'relative' }}
            >
              🔔 Notifications
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-red)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                width: '320px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: '1rem',
                zIndex: 200
              }}>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem', color: 'var(--brand-primary)' }}>
                  System Notifications
                </h4>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No notifications yet.</p>
                ) : (
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: n.is_read ? 'transparent' : '#f0f9ff',
                          borderBottom: '1px solid #f1f5f9',
                          marginBottom: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{n.title}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            {(user.role === 'supervisor' || user.role === 'panel') ? (
              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.15rem' }}>
                <span className="role-badge supervisor">Supervisor</span>
                <span className="role-badge panel">Panel</span>
              </div>
            ) : (
              <span className={`role-badge ${user.role}`}>{user.role}</span>
            )}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
