import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { BarChart3, TrendingUp, Users, Target, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export default function Analytics() {
  const [salesData, setSalesData] = useState([]);
  const [packageDistribution, setPackageDistribution] = useState([]);
  const [repPerformance, setRepPerformance] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, growth: 12.5, activeCustomers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Sales and calculate trends
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (snap) => {
      let revenue = 0;
      const pkgMap = {};
      const repMap = {};
      
      snap.docs.forEach(doc => {
        const s = doc.data();
        const amt = Number(s.amount) || 0;
        revenue += amt;
        
        // Packages
        pkgMap[s.package] = (pkgMap[s.package] || 0) + 1;
        
        // Reps
        repMap[s.repName] = (repMap[s.repName] || 0) + amt;
      });

      setStats(prev => ({ ...prev, totalRevenue: revenue }));
      
      // Transform Packages for Pie Chart
      const pieData = Object.keys(pkgMap).map(key => ({ name: key, value: pkgMap[key] }));
      setPackageDistribution(pieData);

      // Transform Reps for Bar Chart
      const barData = Object.keys(repMap).map(key => ({ name: key, revenue: repMap[key] }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setRepPerformance(barData);
      
      setLoading(false);
    });

    // 2. Fetch Customer Count
    const unsubCust = onSnapshot(collection(db, 'customers'), (snap) => {
      setStats(prev => ({ ...prev, activeCustomers: snap.size }));
    });

    return () => {
      unsubSales();
      unsubCust();
    };
  }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Business Analytics</h1>
          <p>Deep dive into your ISP performance, package popularity, and top sales talent.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Cumulative Revenue', value: `KES ${stats.totalRevenue.toLocaleString()}`, icon: <TrendingUp />, color: 'blue' },
          { label: 'Active Subscribers', value: stats.activeCustomers, icon: <Users />, color: 'green' },
          { label: 'Avg Sale Value', value: `KES ${(stats.totalRevenue / (salesData.length || 1)).toLocaleString()}`, icon: <Activity />, color: 'amber' },
          { label: 'Market Growth', value: `${stats.growth}%`, icon: <Target />, color: 'cyan' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Top Performing Sales Reps (Revenue)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `KES ${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={v => [`KES ${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Package Adoption Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={packageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {packageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {packageDistribution.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                  {p.name}
                </div>
                <span style={{ fontWeight: 600 }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
