import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import SalesLayout from './layouts/SalesLayout';

// Auth
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import Customers from './pages/admin/Customers';
import Sales from './pages/admin/Sales';
import Payments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';

// Sales Rep Pages
import SalesDashboard from './pages/sales/Dashboard';
import RegisterCustomer from './pages/sales/RegisterCustomer';
import RecordSale from './pages/sales/RecordSale';
import RecordPayment from './pages/sales/RecordPayment';
import MyCustomers from './pages/sales/MyCustomers';

// Protected Route wrapper
function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth();
  
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // If user is logged in but has no role (e.g. Firestore profile blocked or missing)
  if (!role) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', color: 'var(--text-primary)' }}>
        <h2>Account Setup Incomplete</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>We couldn't load your account profile. Please check Firestore Security Rules or contact support.</p>
      </div>
    );
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/sales/dashboard'} replace />;
  }
  
  return children;
}

// Root redirect based on role
function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (!role) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', color: 'var(--text-primary)' }}>
        <h2>Account Setup Incomplete</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>We couldn't load your account profile. Please check Firestore Security Rules or contact support.</p>
      </div>
    );
  }
  
  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/sales/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Sales Rep Routes */}
      <Route path="/sales" element={
        <ProtectedRoute allowedRole="salesrep">
          <SalesLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SalesDashboard />} />
        <Route path="register-customer" element={<RegisterCustomer />} />
        <Route path="record-sale" element={<RecordSale />} />
        <Route path="record-payment" element={<RecordPayment />} />
        <Route path="my-customers" element={<MyCustomers />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
