import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/StudentDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import PanelDashboard from './pages/panel/PanelDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/student" element={
                <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
              } />
              <Route path="/supervisor" element={
                <ProtectedRoute roles={['supervisor']}><SupervisorDashboard /></ProtectedRoute>
              } />
              <Route path="/panel" element={
                <ProtectedRoute roles={['panel', 'supervisor']}><PanelDashboard /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />

              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
