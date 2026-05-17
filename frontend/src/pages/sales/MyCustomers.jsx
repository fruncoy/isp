import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, UserSquare2, UserPlus, Settings2, Clock, Zap, Send, CreditCard, RotateCcw, Plus, Loader2, X, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePaystackPayment } from 'react-paystack';

import { BACKEND_URL } from '../../utils/config';

export default function MyCustomers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDuration, setPaymentDuration] = useState('1');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    packageId: '',
    notes: ''
  });

  // Paystack Config for the selected customer
  const paystackConfig = useMemo(() => {
    const currentPkgName = selectedCustomer?.currentPackage || selectedCustomer?.package || '';
    const pkg = packages.find(p => p.name === currentPkgName);
    const amount = Math.round((pkg?.price || selectedCustomer?.currentPrice || 0) * Number(paymentDuration || 1) * 100);

    return {
      reference: paymentReference || `REF-${Date.now()}`,
      email: selectedCustomer?.email || '',
      phone: selectedCustomer?.phone || '',
      amount,
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      currency: 'KES',
      metadata: {
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        repId: userProfile?.uid || '',
        repName: userProfile?.name || '',
        duration: Number(paymentDuration || 1),
        packageId: currentPkgName,
        packageName: currentPkgName,
        packagePrice: pkg?.price || selectedCustomer?.currentPrice || 0,
        packageSpeed: pkg?.speed || selectedCustomer?.currentSpeed || '',
        custom_fields: [
          { display_name: "Customer Name", variable_name: "customer_name", value: selectedCustomer?.name || '' },
          { display_name: "Rep Name", variable_name: "rep_name", value: userProfile?.name || '' }
        ]
      }
    };
  }, [selectedCustomer, packages, paymentDuration, userProfile, paymentReference]);

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleInitializePayment = () => {
    if (!selectedCustomer?.email) {
      toast.error('Customer email is required for payment');
      return;
    }
    const currentPkgName = selectedCustomer?.currentPackage || selectedCustomer?.package || '';
    const pkg = packages.find(p => p.name === currentPkgName);
    const currentPrice = pkg?.price || selectedCustomer?.currentPrice;
    
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
        setSelectedCustomer(null);
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

  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentDuration('1');
    setPaymentReference(`REF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Listen to customers
    const q = query(
      collection(db, 'customers'), 
      where('repId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setCustomers([]);
      setLoading(false);
    });

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

    return () => {
      unsub();
      unsubPkgs();
    };
  }, [userProfile]);

  const handleExport = () => {
    if (customers.length === 0) return toast.error('No data to export');
    
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Package', 'Status', 'Expiry Date'];
    const csvData = filtered.map(c => [
      c.name,
      c.email,
      c.phone,
      `"${c.address?.replace(/"/g, '""')}"`,
      c.currentPackage || c.package || 'N/A',
      c.status,
      c.expiryDate?.toDate ? c.expiryDate.toDate().toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `My_Customers_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting your customer list...');
  };

  const filtered = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  const handleSendReminder = async (customer) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/customers/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: customer.email, 
          name: customer.name,
          expiryDate: customer.expiryDate?.toDate ? customer.expiryDate.toDate().toLocaleDateString() : 'N/A'
        })
      });

      if (response.ok) {
        toast.success(`Reminder sent to ${customer.name}`);
      } else {
        throw new Error('Failed to send reminder');
      }
    } catch (err) { 
      toast.error(err.message);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.packageId) return toast.error('Please select a package');
    if (formData.phone.length !== 12) {
      toast.error('Phone number must be exactly 9 digits after 254');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if email already exists
      const qEmail = query(collection(db, 'customers'), where('email', '==', formData.email.toLowerCase().trim()));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        throw new Error('A customer with this email address is already registered.');
      }

      const selectedPackage = packages.find(p => p.id === formData.packageId);

      // 1. Create Customer
      const customerData = {
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        currentPackage: selectedPackage?.name || '',
        currentSpeed: selectedPackage?.speed || '',
        currentPrice: selectedPackage?.price || 0,
        repId: userProfile.uid,
        repName: userProfile.name,
        status: 'inactive',
        createdAt: serverTimestamp(),
        subscriptionStart: null,
        expiryDate: null
      };

      const docRef = await addDoc(collection(db, 'customers'), customerData);
      const newCustomer = { id: docRef.id, ...customerData };

      // 2. Send Welcome Email
      try {
        await fetch(`${BACKEND_URL}/api/customers/send-welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            name: formData.name,
            packageName: selectedPackage?.name,
            price: selectedPackage?.price,
            speed: selectedPackage?.speed
          })
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }

      toast.success('Customer registered! Opening payment...');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', packageId: '' });

      // 3. Automatically open payment modal for the new customer
      openPaymentModal(newCustomer);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { label: 'Unknown', color: 'var(--text-muted)' };
    const date = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const now = new Date();
    const diff = (date - now) / (1000 * 60 * 60 * 24);

    if (diff < 0) return { label: 'Expired', color: 'var(--danger)' };
    if (diff < 3) return { label: 'Expiring Soon', color: 'var(--warning)' };
    return { label: 'Active', color: 'var(--success)' };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Customers</h1>
          <p>Onboard and manage your assigned internet subscribers.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} /> Export List
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Onboard Customer
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UserSquare2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <h3>No Customers Found</h3>
            <p>You haven't registered any customers yet.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Speed</th>
                  <th>Expiry Date</th>
                  <th>Location</th>
                  <th>Package</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const status = getExpiryStatus(c.expiryDate);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Zap size={14} color="var(--accent)" /> {c.currentSpeed || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: status.color, fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> {c.expiryDate?.toDate ? c.expiryDate.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <MapPin size={14} /> {c.address}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{c.currentPackage || c.package || 'N/A'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {c.status === 'inactive' ? (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => openPaymentModal(c)}
                            style={{ marginRight: '8px' }}
                          >
                            <CreditCard size={14} /> Pay Now
                          </button>
                        ) : (
                          <>
                            <button 
                              className="btn btn-sm btn-ghost"
                              style={{ color: 'var(--accent)', marginRight: '8px' }}
                              onClick={() => openPaymentModal(c)}
                              title="Renew Subscription"
                            >
                              <RotateCcw size={14} /> Renew
                            </button>
                            <button 
                              onClick={() => handleSendReminder(c)}
                              className="btn btn-sm btn-ghost" 
                              style={{ color: 'var(--warning)', marginRight: '8px' }}
                              title="Send Expiry Reminder"
                            >
                              <Send size={14} /> Reminder
                            </button>
                          </>
                        )}
                        <Link to={`/sales/manage-customer/${c.id}`} className="btn btn-sm btn-ghost" style={{ color: 'var(--text-muted)' }}>
                          <Settings2 size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', position: 'relative' }}>
            <button 
              className="btn-close" 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <X size={20} />
            </button>

            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Register New Customer</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Onboard a new subscriber to the network.</p>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (254...)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    color: 'var(--text-muted)', 
                    fontWeight: 600,
                    pointerEvents: 'none'
                  }}>254</span>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: '45px' }}
                    value={formData.phone.startsWith('254') ? formData.phone.substring(3) : formData.phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 9) {
                        setFormData({ ...formData, phone: '254' + val });
                      }
                    }} 
                    placeholder="712345678"
                    required 
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Enter 9 digits after 254</p>
              </div>

              <div className="form-group">
                <label className="form-label">Installation Address</label>
                <textarea className="form-textarea" rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Internet Package</label>
                <select className="form-select" value={formData.packageId} onChange={e => setFormData({ ...formData, packageId: e.target.value })} required>
                  <option value="">-- Select Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.speed} (KES {p.price?.toLocaleString()}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions" style={{ marginTop: '32px' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => !isSubmitting && setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={18} className="spinner" /> Registering...</> : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <h2 style={{ color: '#111827', margin: '0 0 8px', fontSize: '24px', fontWeight: '700' }}>Process Payment</h2>
              <div style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '12px' }}>Customer: <strong style={{ color: '#111827' }}>{selectedCustomer?.name}</strong></div>
                
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
                    value={packages.find(p => p.name === selectedCustomer?.currentPackage)?.id || ''}
                    onChange={e => {
                      const pkg = packages.find(p => p.id === e.target.value);
                      setSelectedCustomer(prev => ({
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
              <label style={{ color: '#374151', fontWeight: 600, marginBottom: '8px', display: 'block', fontSize: '14px' }}>Select Subscription Period</label>
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
                <span style={{ color: '#111827' }}>KES {selectedCustomer?.currentPrice?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                <span>Duration:</span>
                <span style={{ color: '#111827' }}>{paymentDuration} {Number(paymentDuration) === 1 ? 'Month' : 'Months'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #e5e7eb', paddingTop: '16px' }}>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>Total to Pay:</span>
                <span style={{ fontWeight: '800', fontSize: '24px', color: '#059669' }}>KES {((selectedCustomer?.currentPrice || 0) * Number(paymentDuration)).toLocaleString()}</span>
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
                    <><CreditCard size={18} /> Pay KES {((selectedCustomer?.currentPrice || 0) * Number(paymentDuration || 1)).toLocaleString()}</>
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
    </div>
  );
}
