import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, UserPlus, Banknote, CreditCard, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SalesDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ 
    myCustomers: 0, 
    salesToday: 0, 
    paymentsToday: 0,
    monthlyTotal: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Constants
  const MONTHLY_TARGET = 50000;

  useEffect(() => {
    if (!userProfile?.uid) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const unsubs = [];

    // 1. My Customers count
    const qCust = query(collection(db, 'customers'), where('repId', '==', userProfile.uid));
    const u1 = onSnapshot(qCust, (snap) => {
      setStats(prev => ({ ...prev, myCustomers: snap.size }));
      setLoading(false);
    });
    unsubs.push(u1);

    // 2. My Sales (real-time)
    const qSales = query(collection(db, 'sales'), where('repId', '==', userProfile.uid));
    const u2 = onSnapshot(qSales, (snap) => {
      let salesTodayCount = 0;
      let monthTotal = 0;
      
      snap.docs.forEach(d => {
        const data = d.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const amt = Number(data.amount) || 0;
        
        if (date.toISOString().split('T')[0] === todayStr) salesTodayCount++;
        if (date >= firstDayOfMonth) monthTotal += amt;
      });
      
      setStats(prev => ({ ...prev, salesToday: salesTodayCount, monthlyTotal: monthTotal }));
    });
    unsubs.push(u2);

    // 3. My Payments Today + Recent Activity
    const qPay = query(collection(db, 'payments'), where('repId', '==', userProfile.uid));
    const u3 = onSnapshot(qPay, (snap) => {
      let dailyTotal = 0;
      const activity = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dt = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        if (dt.toISOString().split('T')[0] === todayStr) {
          dailyTotal += (Number(data.amount) || 0);
        }
        activity.push({
          id: docSnap.id,
          text: `Collected KES ${(data.amount || 0).toLocaleString()} from ${data.customerName}`,
          date: dt
        });
      });
      activity.sort((a, b) => (b.date || 0) - (a.date || 0));
      setRecentActivity(activity.slice(0, 5));
      setStats(prev => ({ ...prev, paymentsToday: dailyTotal }));
    });
    unsubs.push(u3);

    return () => unsubs.forEach(u => u());
  }, [userProfile]);

  const targetProgress = Math.min((stats.monthlyTotal / MONTHLY_TARGET) * 100, 100).toFixed(1);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1>Welcome, {userProfile?.name?.split(' ')[0] || 'Rep'}!</h1>
          <p>Here is your live daily summary and monthly performance.</p>
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
            <div className="stat-value">KES {stats.paymentsToday.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon" style={{ background: 'var(--bg-surface)', width: '32px', height: '32px' }}><Target size={18} color="var(--accent)" /></div>
            <h3 style={{ fontSize: '15px', margin: 0 }}>Monthly Sales Target</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>KES {stats.monthlyTotal.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: KES {MONTHLY_TARGET.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ 
            height: '100%', 
            width: `${targetProgress}%`, 
            background: Number(targetProgress) > 70 ? 'var(--success)' : 'var(--accent)',
            transition: 'width 1s ease-in-out'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>{targetProgress}% achieved</span>
          <span style={{ fontWeight: 600 }}>{100 - Number(targetProgress) > 0 ? `KES ${(MONTHLY_TARGET - stats.monthlyTotal).toLocaleString()} to goal` : 'Goal reached!'}</span>
        </div>
      </div>

      <h3 style={{ margin: '30px 0 16px', fontSize: '15px' }}>Quick Navigation</h3>
      <div className="charts-grid" style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)', gap: '16px' }}>
        <Link to="/sales/my-customers" className="card action-card">
          <div className="stat-icon action-icon"><UserPlus size={20} color="var(--accent)" /></div>
          <span className="action-text">Customer Management</span>
        </Link>
        <Link to="/sales/record-sale" className="card action-card">
          <div className="stat-icon action-icon"><Banknote size={20} color="var(--success)" /></div>
          <span className="action-text">Sales Records</span>
        </Link>
        <Link to="/sales/record-payment" className="card action-card">
          <div className="stat-icon action-icon"><CreditCard size={20} color="var(--warning)" /></div>
          <span className="action-text">Payment History</span>
        </Link>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>Your recent customer registrations and sales will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map(item => (
              <div key={item.id} style={{ fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                {item.date && (
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>
                    {item.date.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

