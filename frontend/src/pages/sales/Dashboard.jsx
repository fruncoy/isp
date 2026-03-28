import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, UserPlus, Banknote, CreditCard } from 'lucide-react';

export default function SalesDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ 
    myCustomers: 0, 
    salesToday: 0, 
    paymentsToday: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will query firebase using userProfile.uid
    setStats({
      myCustomers: 14,
      salesToday: 2,
      paymentsToday: 150
    });
    setLoading(false);
  }, [userProfile]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Welcome, {userProfile?.name?.split(' ')[0] || 'Rep'}!</h1>
          <p>Here is your daily summary and quick actions.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">My Customers</div>
            <div className="stat-value">{stats.myCustomers}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><Banknote size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Sales Today</div>
            <div className="stat-value">{stats.salesToday}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Collections Today</div>
            <div className="stat-value">${stats.paymentsToday.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '30px 0 16px', fontSize: '15px' }}>Quick Actions</h3>
      <div className="charts-grid" style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)', gap: '16px' }}>
        <a href="/sales/register-customer" className="card" style={{ textDecoration: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: 'var(--bg-surface)' }}><UserPlus size={20} color="var(--accent)" /></div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Register Customer</span>
        </a>
        
        <a href="/sales/record-sale" className="card" style={{ textDecoration: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: 'var(--bg-surface)' }}><Banknote size={20} color="var(--success)" /></div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Record New Sale</span>
        </a>

        <a href="/sales/record-payment" className="card" style={{ textDecoration: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: 'var(--bg-surface)' }}><CreditCard size={20} color="var(--warning)" /></div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Record Payment</span>
        </a>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>Recent Activity</h3>
        <div className="empty-state" style={{ padding: '30px' }}>
          <p>Your recent customer registrations and sales will appear here.</p>
        </div>
      </div>
    </div>
  );
}
