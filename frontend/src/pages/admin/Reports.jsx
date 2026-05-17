import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
  const [repPerformance, setRepPerformance] = useState([]);
  const [packagesDistribution, setPackagesDistribution] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsSubmitting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const unsubs = [];

    // 1. Sales rep performance — aggregate sales & revenue per rep
    const u1 = onSnapshot(collection(db, 'sales'), (snap) => {
      const repMap = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const name = data.repName || 'Unknown';
        if (!repMap[name]) repMap[name] = { name, sales: 0, revenue: 0 };
        repMap[name].sales += 1;
        repMap[name].revenue += (data.amount || 0);
      });
      setRepPerformance(Object.values(repMap));
    });
    unsubs.push(u1);

    // 2. Package distribution from customers
    const u2 = onSnapshot(collection(db, 'customers'), (snap) => {
      const pkgMap = {};
      snap.docs.forEach(d => {
        const pkg = d.data().currentPackage || d.data().package || 'Unknown';
        pkgMap[pkg] = (pkgMap[pkg] || 0) + 1;
      });
      setPackagesDistribution(Object.entries(pkgMap).map(([name, value]) => ({ name, value })));
      setLoading(false);
    });
    unsubs.push(u2);

    // 3. Monthly revenue from payments
    const u3 = onSnapshot(collection(db, 'payments'), (snap) => {
      const monthMap = {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      snap.docs.forEach(d => {
        const data = d.data();
        let dt = null;
        if (data.date?.toDate) dt = data.date.toDate();
        else if (data.date) dt = new Date(data.date);
        if (dt) {
          const key = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2,'0')}`;
          const label = `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
          if (!monthMap[key]) monthMap[key] = { key, name: label, revenue: 0 };
          monthMap[key].revenue += (data.amount || 0);
        }
      });
      const sorted = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
      setRevenueByMonth(sorted.slice(-12)); // last 12 months
    });
    unsubs.push(u3);

    return () => unsubs.forEach(u => u());
  }, []);

  const handleDownloadPDF = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading('Preparing report...');
    
    try {
      // Use window.print() for a clean, browser-native PDF generation
      // We'll add a print-only style block temporarily
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 20px;
          }
          .no-print { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; break-inside: avoid; }
          .charts-grid { display: block !important; }
          .charts-grid > .card { width: 100% !important; margin-bottom: 20px !important; }
          h1 { color: #111 !important; margin-bottom: 10px !important; }
          p { color: #444 !important; }
        }
      `;
      document.head.appendChild(style);
      
      window.print();
      
      document.head.removeChild(style);
      toast.success('Report ready for download', { id: toastId });
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const hasData = repPerformance.length > 0 || packagesDistribution.length > 0 || revenueByMonth.length > 0;

  return (
    <div id="report-content">
      <div className="page-header">
        <div>
          <h1>Analytics & Reports</h1>
          <p>Live insights into sales performance, revenue, and customer acquisition.</p>
        </div>
        <button 
          className="btn btn-primary no-print" 
          onClick={handleDownloadPDF}
          disabled={isExporting}
        >
          {isExporting ? <Loader2 size={18} className="spinner" /> : <Download size={18} />}
          Export PDF
        </button>
      </div>

      {!hasData ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <h3>No Data Yet</h3>
            <p>Charts will populate automatically as sales reps add customers, sales, and payments.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="charts-grid" style={{ marginBottom: '24px' }}>
            {/* Revenue Line Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Monthly Revenue Overview</h3>
              {revenueByMonth.length === 0 ? (
                <div className="empty-state" style={{ padding: '60px 0' }}><p>No payment data yet.</p></div>
              ) : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} formatter={v => [`KES ${v.toLocaleString()}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Rep Performance Bar Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Sales Rep Performance</h3>
              {repPerformance.length === 0 ? (
                <div className="empty-state" style={{ padding: '60px 0' }}><p>No sales data yet.</p></div>
              ) : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                      <Legend iconType="circle" />
                      <Bar yAxisId="left" dataKey="sales" fill="var(--accent)" name="Total Sales" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="revenue" fill="var(--warning)" name="Revenue Generated" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Package Distribution</h3>
              {packagesDistribution.length === 0 ? (
                <div className="empty-state" style={{ padding: '60px 0' }}><p>No customers yet.</p></div>
              ) : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={packagesDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="var(--bg-secondary)"
                        strokeWidth={2}
                      >
                        {packagesDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            
            {/* Report Footer - only visible in print */}
            <div className="card" style={{ display: 'none' }}>
              <div className="print-only" style={{ display: 'block', borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                ISP Management System - Official Business Report - {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <style>{`
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              .card { box-shadow: none !important; border: 1px solid #eee !important; margin-bottom: 20px; break-inside: avoid; }
              body { background: white !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
