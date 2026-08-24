import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      client.get('/auth/notifications')
        .then(res => setNotifications(res.data))
        .catch(() => {});
    }
  }, [user]);

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
            <span className={`role-badge ${user.role}`}>{user.role}</span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
