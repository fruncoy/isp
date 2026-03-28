import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Wifi, 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Banknote, 
  CreditCard,
  PieChart,
  LogOut
} from 'lucide-react';

export default function AdminSidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Wifi size={22} color="var(--accent)" />
          <h2>ISP Portal</h2>
        </div>
        <span>Management Area</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>
        <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <div className="nav-section-label">Management</div>
        <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Manage Team
        </NavLink>
        <NavLink to="/admin/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserSquare2 size={18} /> Customers
        </NavLink>

        <div className="nav-section-label">Finance</div>
        <NavLink to="/admin/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Banknote size={18} /> Sales Records
        </NavLink>
        <NavLink to="/admin/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} /> Payments
        </NavLink>

        <div className="nav-section-label">Analytics</div>
        <NavLink to="/admin/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={18} /> Reports
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div 
          className="nav-item" 
          onClick={() => logout()}
          style={{ cursor: 'pointer', color: 'var(--danger)' }}
        >
          <LogOut size={18} /> Sign Out
        </div>
      </div>
    </aside>
  );
}
