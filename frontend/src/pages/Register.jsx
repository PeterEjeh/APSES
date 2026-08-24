import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

export default function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    matric_or_staff_no: '',
    department: 'Computer Science',
    specializations: 'AI, Data Science, Software Engineering',
    max_students: 5
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await client.post('/auth/register', form);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">A</div>
          <h2>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Automated Project Supervision & Evaluation System
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              className="form-control"
              placeholder="e.g. Mariya Isa"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. mariya@atbu.edu.ng"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Account Role</label>
            <select
              className="form-control"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="supervisor">Supervisor</option>
              <option value="panel">Panel Member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label>{form.role === 'student' ? 'Matriculation Number' : 'Staff Number / ID'}</label>
            <input
              className="form-control"
              placeholder={form.role === 'student' ? '20/55777U/1' : 'P.10492'}
              value={form.matric_or_staff_no}
              onChange={(e) => setForm({ ...form, matric_or_staff_no: e.target.value })}
            />
          </div>

          {form.role === 'supervisor' && (
            <>
              <div className="form-group">
                <label>Specializations (comma-separated)</label>
                <input
                  className="form-control"
                  placeholder="e.g. AI, Machine Learning, Networks, Security"
                  value={form.specializations}
                  onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Maximum Student Capacity (1 - 1000)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="form-control"
                  value={form.max_students}
                  onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || '' })}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
