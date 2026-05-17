import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Topbar() {
  const { userProfile, role, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          {role === 'admin' ? 'Administrator Portal' : 'Sales Portal'}
        </div>
      </div>
      
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <NotificationCenter />
        
        <span className={`role-badge ${role}`}>
          {role === 'admin' ? 'Admin' : 'Sales Rep'}
        </span>
        
        <div className="topbar-user" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{userProfile?.name || 'User'}</span>
          <div className="topbar-avatar" style={{ background: 'var(--accent)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
