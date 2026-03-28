import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Users, 
  Wifi, 
  CreditCard, 
  TrendingUp, 
  ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    salesCount: 0,
    revenue: 0,
    activeReps: 0
  });
  const [loading, setLoading] = useState(true);

  // Mock chart data for now
  const revenueData = [
    { name: 'Mon', revenue: 1200 },
    { name: 'Tue', revenue: 2100 },
    { name: 'Wed', revenue: 800 },
    { name: 'Thu', revenue: 1600 },
    { name: 'Fri', revenue: 3200 },
    { name: 'Sat', revenue: 2800 },
    { name: 'Sun', revenue: 1900 },
  ];

  useEffect(() => {
    // We will build the actual data fetching logic once backend/DB is populated
    // For now, setting some dummy data to verify layout
    setStats({
      customers: 248,
      salesCount: 18,
      revenue: 42500,
      activeReps: 5
    });
    setLoading(false);
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here's what's happening today.</p>
        </div>
        <button className="btn btn-primary">
          Generate Report <ArrowRight size={16} />
        </button>
      </div>

      {/* Top Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-sub" style={{ color: 'var(--success)' }}>+12 this week</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><Wifi size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">New Installs</div>
            <div className="stat-value">{stats.salesCount}</div>
            <div className="stat-sub" style={{ color: 'var(--success)' }}>+3 today</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber"><CreditCard size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value">${stats.revenue.toLocaleString()}</div>
            <div className="stat-sub" style={{ color: 'var(--success)' }}>+15% from last month</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Active Sales Reps</div>
            <div className="stat-value">{stats.activeReps}</div>
            <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>Out of 6 total</div>
          </div>
        </div>
      </div>

      {/* Charts & Lists */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Revenue Trends (Last 7 Days)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-primary)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Recent Activity</h3>
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p>Activity stream will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
