import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Wifi, 
  LayoutDashboard, 
  UserPlus, 
  Banknote, 
  CreditCard,
  Users,
  LogOut
} from 'lucide-react';

export default function SalesSidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Wifi size={22} color="var(--success)" />
          <h2>ISP Portal</h2>
        </div>
        <span style={{ color: 'var(--success)' }}>Sales Workspace</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Daily Workflow</div>
        <NavLink to="/sales/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> My Dashboard
        </NavLink>

        <div className="nav-section-label">Actions</div>
        <NavLink to="/sales/register-customer" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserPlus size={18} /> Register Customer
        </NavLink>
        <NavLink to="/sales/record-sale" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Banknote size={18} /> Record Sale
        </NavLink>
        <NavLink to="/sales/record-payment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} /> Record Payment
        </NavLink>

        <div className="nav-section-label">Records</div>
        <NavLink to="/sales/my-customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={18} /> My Customers
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
