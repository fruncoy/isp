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
  Settings,
  History,
  BarChart3,
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
        <NavLink to="/admin/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} /> Analytics
        </NavLink>

        <div className="nav-section-label">Management</div>
        <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Sales Rep Mgt
        </NavLink>
        <NavLink to="/admin/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserSquare2 size={18} /> Customer Mgt
        </NavLink>
        <NavLink to="/admin/services" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Services Catalogue
        </NavLink>

        <div className="nav-section-label">Finance</div>
        <NavLink to="/admin/sales" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Banknote size={18} /> Sales Records
        </NavLink>
        <NavLink to="/admin/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} /> Payments
        </NavLink>

        <div className="nav-section-label">System</div>
        <NavLink to="/admin/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={18} /> Reports
        </NavLink>
        <NavLink to="/admin/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={18} /> Activity Logs
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

