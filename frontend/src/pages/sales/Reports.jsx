import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { PieChart, Download, FileText, Calendar, Filter } from 'lucide-react';

export default function SalesReports() {
  const { userProfile } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'sales'), 
      where('repId', '==', userProfile.uid),
      orderBy('date', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [userProfile]);

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Sales Reports</h1>
          <p>Analyze your performance and track your earned commissions.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FileText size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Sales Logged</div>
            <div className="stat-value">{sales.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><PieChart size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Revenue Value</div>
            <div className="stat-value">KES {totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px' }}>Detailed Sales History</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-sm btn-ghost"><Filter size={14} /> Filter</button>
            <button className="btn btn-sm btn-ghost"><Calendar size={14} /> This Month</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : sales.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <PieChart size={40} style={{ opacity: 0.1, marginBottom: '16px' }} />
            <p>No sales records found for your account.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {s.date?.toDate ? s.date.toDate().toLocaleDateString() : new Date(s.date).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.customerName}</td>
                    <td><span className="badge badge-info">{s.package}</span></td>
                    <td>{s.type}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      KES {Number(s.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
