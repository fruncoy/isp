import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Topbar() {
  const { userProfile, role, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          {role === 'admin' ? 'Administrator Portal' : 'Sales Portal'}
        </div>
      </div>
      
      <div className="topbar-right">
        <span className={`role-badge ${role}`}>
          {role === 'admin' ? 'Admin' : 'Sales Rep'}
        </span>
        
        <div className="topbar-user">
          {userProfile?.name || 'User'}
        </div>
        
        <div className="topbar-avatar">
          {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div 
          onClick={() => logout()} 
          style={{ marginLeft: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}
          title="Logout"
        >
          <LogOut size={20} />
        </div>
      </div>
    </header>
  );
}
