import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Wifi, CreditCard, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ customers: 0, salesCount: 0, revenue: 0, activeReps: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Build last 7 days labels once
  const buildDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        name: d.toLocaleDateString('en', { weekday: 'short' }),
        dateStr: d.toISOString().split('T')[0],
      });
    }
    return days;
  };

  useEffect(() => {
    const days = buildDays();
    const unsubs = [];

    // 1. Total customers — real-time count
    const u1 = onSnapshot(collection(db, 'customers'), (snap) => {
      setStats(prev => ({ ...prev, customers: snap.size }));
      setLoading(false);
    }, () => setLoading(false));
    unsubs.push(u1);

    // 2. Total sales count — real-time
    const u2 = onSnapshot(collection(db, 'sales'), (snap) => {
      setStats(prev => ({ ...prev, salesCount: snap.size }));
    });
    unsubs.push(u2);

    // 3. Payments — total revenue + chart + recent activity
    const u3 = onSnapshot(collection(db, 'payments'), (snap) => {
      let total = 0;
      const chartMap = {};
      days.forEach(d => { chartMap[d.dateStr] = 0; });

      const activity = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const amount = data.amount || 0;
        total += amount;

        // Resolve date
        let dt = null;
        if (data.date?.toDate) dt = data.date.toDate();
        else if (data.date) dt = new Date(data.date);

        if (dt) {
          const ds = dt.toISOString().split('T')[0];
          if (ds in chartMap) chartMap[ds] += amount;
        }

        activity.push({
          id: docSnap.id,
          text: `${data.repName || 'A rep'} collected KES ${amount.toLocaleString()} from ${data.customerName || 'a customer'}`,
          date: dt,
        });
      });

      // Sort activity newest first, take top 5
      activity.sort((a, b) => (b.date || 0) - (a.date || 0));
      setRecentActivity(activity.slice(0, 5));
      setStats(prev => ({ ...prev, revenue: total }));
      setRevenueData(days.map(d => ({ name: d.name, revenue: chartMap[d.dateStr] || 0 })));
    });
    unsubs.push(u3);

    // 4. Active sales reps count
    const qReps = query(collection(db, 'users'), where('role', '==', 'salesrep'));
    const u4 = onSnapshot(qReps, (snap) => {
      const active = snap.docs.filter(d => d.data().status !== 'disabled').length;
      setStats(prev => ({ ...prev, activeReps: active }));
    });
    unsubs.push(u4);

    return () => unsubs.forEach(u => u());
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Live data — updates in real-time as your team works.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>Registered in system</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><Wifi size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">{stats.salesCount}</div>
            <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>All time records</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">KES {stats.revenue.toLocaleString()}</div>
            <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>All collected payments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Active Sales Reps</div>
            <div className="stat-value">{stats.activeReps}</div>
            <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>Currently active</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Revenue — Last 7 Days</h3>
          {revenueData.every(d => d.revenue === 0) ? (
            <div className="empty-state" style={{ padding: '60px 0' }}>
              <p>No payment data yet for this week.</p>
            </div>
          ) : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `KES ${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={v => [`KES ${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p>Activity will appear here as payments are recorded.</p>
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
    </div>
  );
}
