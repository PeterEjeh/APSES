import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASHBOARD_BY_ROLE = {
  student: '/student',
  supervisor: '/supervisor',
  panel: '/panel',
  admin: '/admin'
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(DASHBOARD_BY_ROLE[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">A</div>
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)' }}>APSES Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Faculty of Computing — ATBU Bauchi
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. admin@atbu.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '1.25rem 0 1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
            Demo User Sign In Credentials:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('admin@atbu.edu.ng', 'Password123!')}>
              Admin
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('iyakubu@atbu.edu.ng', 'Password123!')}>
              Supervisor
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('misa@atbu.edu.ng', 'Password123!')}>
              Student
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('panel@atbu.edu.ng', 'Password123!')}>
              Panel Member
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.825rem' }}>
          Need a user account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
