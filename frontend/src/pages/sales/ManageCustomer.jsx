import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  User, MapPin, Phone, Mail, Calendar, Wifi, 
  CreditCard, History, ArrowLeft, RefreshCw, 
  ArrowUpCircle, HardDrive, Loader2, CheckCircle2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaystackPayment } from 'react-paystack';

import { BACKEND_URL } from '../../utils/config';

export default function ManageCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [packages, setPackages] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDuration, setPaymentDuration] = useState('1');
  const [isVerifying, setIsVerifying] = useState(false);

  // Paystack Config
  const paystackConfig = useMemo(() => {
    const currentPkgName = customer?.currentPackage || customer?.package || '';
    const pkg = packages.find(p => p.name === currentPkgName);
    const amount = Math.round((pkg?.price || customer?.currentPrice || 0) * Number(paymentDuration || 1) * 100);

    return {
      reference: paymentReference || `REF-${Date.now()}`,
      email: customer?.email || '',
      phone: customer?.phone || '',
      amount,
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      currency: 'KES',
      metadata: {
        customerId: customer?.id || '',
        customerName: customer?.name || '',
        repId: userProfile?.uid || '',
        repName: userProfile?.name || '',
        duration: Number(paymentDuration || 1),
        packageId: currentPkgName,
        packageName: currentPkgName,
        packagePrice: pkg?.price || customer?.currentPrice || 0,
        packageSpeed: pkg?.speed || customer?.currentSpeed || '',
        custom_fields: [
          { display_name: "Customer Name", variable_name: "customer_name", value: customer?.name || '' },
          { display_name: "Rep Name", variable_name: "rep_name", value: userProfile?.name || '' }
        ]
      }
    };
  }, [customer, packages, paymentDuration, userProfile, paymentReference]);

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleInitializePayment = () => {
    if (!customer?.email) {
      toast.error('Customer email is required for payment');
      return;
    }
    
    const currentPkgName = customer?.currentPackage || customer?.package || '';
    const pkg = packages.find(p => p.name === currentPkgName);
    const currentPrice = pkg?.price || customer?.currentPrice;

    if (!currentPrice || currentPrice <= 0) {
      toast.error('Please select a package with a valid price');
      return;
    }

    // Ensure amount is at least 1000 cents (10 KES) for Mobile Money
    if (paystackConfig.amount < 1000) {
      toast.error('Minimum payment amount is KES 10');
      return;
    }

    try {
      initializePayment(handlePaymentSuccess, handlePaymentClose);
    } catch (err) {
      console.error('Paystack initialization failed:', err);
      toast.error('Could not open payment window. Please check your internet or try again.');
    }
  };

  const handlePaymentSuccess = async (reference) => {
    console.log('Payment success callback triggered:', reference);
    setIsVerifying(true);
    try {
      const ref = reference.reference || reference;
      const response = await fetch(`${BACKEND_URL}/api/paystack/verify/${ref}`);
      const data = await response.json();
      console.log('Verification response:', data);
      
      if (data.status === 'success') {
        toast.success('Payment verified! Subscription active.');
        setIsPaymentModalOpen(false);
      } else {
        toast.error('Verification failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Error verifying payment: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaymentClose = () => {
    console.log('Payment window closed by user');
    toast.error('Payment cancelled');
  };

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

  useEffect(() => {
    // Listen to packages
    const qPkgs = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsubPkgs = onSnapshot(qPkgs, (snap) => {
      setPackages(snap.docs.map(d => ({
        id: d.id, 
        name: d.data().name,
        price: d.data().price,
        speed: d.data().speed
      })));
    });

    return () => unsubPkgs();
  }, []);

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
          <button className="btn btn-primary" onClick={() => {
            setPaymentReference(`REF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
            setIsPaymentModalOpen(true);
          }}>
            <RefreshCw size={18} />
            Renew Subscription
          </button>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => !isVerifying && setIsPaymentModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '400px', 
            backgroundColor: '#ffffff', 
            color: '#1f2937',
            padding: '32px',
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ background: '#eff6ff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard size={32} color="#3b82f6" />
              </div>
              <h2 style={{ color: '#111827', margin: '0 0 8px', fontSize: '24px', fontWeight: '700' }}>Process Renewal</h2>
              <div style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '12px' }}>Customer: <strong style={{ color: '#111827' }}>{customer?.name}</strong></div>
                
                <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
                  <label style={{ color: '#374151', fontWeight: 600, marginBottom: '8px', display: 'block', fontSize: '14px' }}>Internet Package</label>
                  <select 
                    className="form-select"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '2px solid #e5e7eb', 
                      backgroundColor: '#ffffff', 
                      color: '#111827',
                      fontSize: '14px',
                      fontWeight: '500',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    value={packages.find(p => p.name === customer?.currentPackage)?.id || ''}
                    onChange={e => {
                      const pkg = packages.find(p => p.id === e.target.value);
                      setCustomer(prev => ({
                        ...prev,
                        currentPackage: pkg.name,
                        currentPrice: pkg.price,
                        currentSpeed: pkg.speed
                      }));
                    }}
                  >
                    <option value="">-- Select Package --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.speed} (KES {p.price?.toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ color: '#374151', fontWeight: 600, marginBottom: '8px', display: 'block', fontSize: '14px' }}>Select Renewal Period</label>
              <select 
                className="form-select"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '2px solid #e5e7eb', 
                  backgroundColor: '#ffffff', 
                  color: '#111827',
                  fontSize: '15px',
                  fontWeight: '500',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
                value={paymentDuration}
                onChange={e => setPaymentDuration(e.target.value)}
              >
                <option value="1">1 Month (Monthly)</option>
                <option value="3">3 Months (Quarterly)</option>
                <option value="6">6 Months (Half-Year)</option>
                <option value="12">12 Months (Annual)</option>
              </select>
            </div>

            <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                <span>Monthly Rate:</span>
                <span style={{ color: '#111827' }}>KES {customer?.currentPrice?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                <span>Duration:</span>
                <span style={{ color: '#111827' }}>{paymentDuration} {Number(paymentDuration) === 1 ? 'Month' : 'Months'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #e5e7eb', paddingTop: '16px' }}>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>Total to Pay:</span>
                <span style={{ fontWeight: '800', fontSize: '24px', color: '#059669' }}>KES {((customer?.currentPrice || 0) * Number(paymentDuration)).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="btn" 
                style={{ 
                  flex: 1, 
                  padding: '14px', 
                  borderRadius: '10px', 
                  border: '1px solid #e5e7eb', 
                  backgroundColor: '#ffffff', 
                  color: '#4b5563',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }} 
                onClick={() => setIsPaymentModalOpen(false)} 
                disabled={isVerifying}
              >
                Cancel
              </button>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  type="button"
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    backgroundColor: '#3b82f6', 
                    color: '#ffffff', 
                    fontWeight: '700',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }} 
                  onClick={handleInitializePayment}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <><Loader2 size={18} className="spinner" /> Verifying...</>
                  ) : (
                    <><CreditCard size={18} /> Pay KES {((customer?.currentPrice || 0) * Number(paymentDuration)).toLocaleString()}</>
                  )}
                </button>
                <button 
                  type="button"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#3b82f6', 
                    fontSize: '12px', 
                    textDecoration: 'underline', 
                    cursor: 'pointer' 
                  }}
                  onClick={() => handlePaymentSuccess(paystackConfig.reference)}
                >
                  I've paid but the window didn't close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="stat-value" style={{ fontSize: '20px' }}>{customer.currentPackage || customer.package || 'None'}</div>
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
