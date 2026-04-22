import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  User, MapPin, Phone, Mail, Calendar, Wifi, 
  CreditCard, History, ArrowLeft, RefreshCw, 
  ArrowUpCircle, HardDrive, Loader2, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. Listen to customer details
    const unsubCust = onSnapshot(doc(db, 'customers', id), (docSnap) => {
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error('Customer not found');
        navigate('/sales/my-customers');
      }
      setLoading(false);
    });

    // 2. Listen to recent sales
    const qSales = query(
      collection(db, 'sales'), 
      where('customerId', '==', id), 
      orderBy('date', 'desc'),
      limit(5)
    );
    const unsubSales = onSnapshot(qSales, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Listen to recent payments
    const qPay = query(
      collection(db, 'payments'), 
      where('customerId', '==', id), 
      orderBy('date', 'desc'),
      limit(5)
    );
    const unsubPay = onSnapshot(qPay, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubCust();
      unsubSales();
      unsubPay();
    };
  }, [id]);

  const handleRenew = async () => {
    if (!window.confirm(`Renew subscription for ${customer.name}? This will record a KES ${customer.currentPrice} sale.`)) return;
    
    setActionLoading(true);
    try {
      const newExpiry = new Date(customer.expiryDate?.toDate ? customer.expiryDate.toDate() : new Date());
      // If already expired, start from today. If not, extend from expiry.
      const now = new Date();
      const baseDate = newExpiry > now ? newExpiry : now;
      baseDate.setDate(baseDate.getDate() + 30);

      // 1. Record Sale
      await addDoc(collection(db, 'sales'), {
        customerId: customer.id,
        customerName: customer.name,
        package: customer.currentPackage,
        amount: customer.currentPrice,
        type: 'Renewal',
        repId: userProfile.uid,
        repName: userProfile.name,
        date: new Date(),
        createdAt: serverTimestamp()
      });

      // 2. Update Expiry
      await updateDoc(doc(db, 'customers', customer.id), {
        expiryDate: baseDate,
        status: 'active'
      });

      // 3. Log
      await addDoc(collection(db, 'logs'), {
        action: 'subscription_renewed',
        repId: userProfile.uid,
        repName: userProfile.name,
        text: `Renewed subscription for ${customer.name} until ${baseDate.toLocaleDateString()}`,
        timestamp: serverTimestamp()
      });

      toast.success('Subscription renewed successfully');
    } catch (err) {
      toast.error('Renewal failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const isExpired = customer.expiryDate?.toDate ? customer.expiryDate.toDate() < new Date() : false;
  const expiryDateStr = customer.expiryDate?.toDate ? customer.expiryDate.toDate().toLocaleDateString() : 'N/A';

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/sales/my-customers" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back to Customers
        </Link>
      </div>

      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1>{customer.name}</h1>
            <span className={`badge ${customer.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
              {customer.status || 'Active'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {customer.phone}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {customer.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {customer.address}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/sales/record-payment" className="btn btn-ghost">
            <CreditCard size={18} /> Record Payment
          </Link>
          <button className="btn btn-primary" onClick={handleRenew} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={18} className="spinner-lucide" /> : <RefreshCw size={18} />}
            Renew Subscription
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: '32px' }}>
        <div className="card" style={{ borderLeft: `4px solid ${isExpired ? 'var(--danger)' : 'var(--success)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Subscription Status</div>
              <div className="stat-value" style={{ color: isExpired ? 'var(--danger)' : 'var(--success)', fontSize: '20px' }}>
                {isExpired ? 'EXPIRED' : 'ACTIVE'}
              </div>
              <div className="stat-sub">Valid until {expiryDateStr}</div>
            </div>
            <Calendar size={32} style={{ opacity: 0.2 }} />
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">Current Service</div>
              <div className="stat-value" style={{ fontSize: '20px' }}>{customer.currentPackage || 'None'}</div>
              <div className="stat-sub">{customer.currentSpeed || '0 Mbps'} Bandwidth</div>
            </div>
            <Wifi size={32} style={{ opacity: 0.2 }} />
          </div>
        </div>
      </div>

      <h3 style={{ margin: '32px 0 16px', fontSize: '16px' }}>Quick Management Actions</h3>
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Link to="/sales/record-sale" className="card action-card">
          <div className="stat-icon" style={{ background: 'var(--bg-surface)' }}><ArrowUpCircle size={20} color="var(--accent)" /></div>
          <div>
            <div style={{ fontWeight: 600 }}>Upgrade / Change</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Switch to a faster package</div>
          </div>
        </Link>
        <Link to="/sales/record-sale" className="card action-card">
          <div className="stat-icon" style={{ background: 'var(--bg-surface)' }}><HardDrive size={20} color="var(--warning)" /></div>
          <div>
            <div style={{ fontWeight: 600 }}>Hardware Replacement</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Log a KES 500 router swap</div>
          </div>
        </Link>
      </div>

      <div className="charts-grid" style={{ marginTop: '32px', gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <History size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '15px', margin: 0 }}>Recent Transactions</h3>
          </div>
          {sales.length === 0 ? <p className="empty-state">No sales recorded.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sales.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{s.type} - {s.package}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.date?.toDate ? s.date.toDate().toLocaleDateString() : ''}</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>KES {s.amount?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CreditCard size={18} color="var(--success)" />
            <h3 style={{ fontSize: '15px', margin: 0 }}>Recent Payments</h3>
          </div>
          {payments.length === 0 ? <p className="empty-state">No payments found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.method} Payment</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.date?.toDate ? p.date.toDate().toLocaleDateString() : ''}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>KES {p.amount?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
