import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Wifi, 
  LayoutDashboard, 
  Users, 
  CreditCard,
  PieChart,
  LogOut,
  UserPlus,
  Banknote
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
        <div className="nav-section-label">Overview</div>
        <NavLink to="/sales/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <div className="nav-section-label">Management</div>
        <NavLink to="/sales/my-customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Customer Mgt
        </NavLink>

        <div className="nav-section-label">Financials</div>
        <NavLink to="/sales/record-payment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} /> Payment History
        </NavLink>
        <NavLink to="/sales/record-sale" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Banknote size={18} /> Sales Records
        </NavLink>

        <div className="nav-section-label">Insights</div>
        <NavLink to="/sales/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={18} /> Reports
        </NavLink>
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: 'auto' }}>
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

