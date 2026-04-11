import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import PaymentPendingPage from './pages/PaymentPendingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminPaymentsPage from './pages/AdminPaymentsPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';

function Protected({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <div className="app-shell muted">Loading…</div>;
  return children;
}

function ProtectedAdmin({ children }) {
  const adminToken = localStorage.getItem('pc_admin_token');
  if (!adminToken) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/payment" replace />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/payment/pending" element={<PaymentPendingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdmin>
            <AdminDashboardPage />
          </ProtectedAdmin>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedAdmin>
            <AdminPaymentsPage />
          </ProtectedAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedAdmin>
            <AdminUsersPage />
          </ProtectedAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/payment" replace />} />
    </Routes>
  );
}
