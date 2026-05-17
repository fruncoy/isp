import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, doc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, MapPin, UserSquare2, Plus, Loader2, Check, X, CreditCard, RotateCcw, Send, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaystackPayment } from 'react-paystack';

import { BACKEND_URL } from '../../utils/config';

export default function Customers() {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [reps, setReps] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reassignData, setReassignData] = useState({ customerId: '', customerName: '', currentRepId: '', currentRepName: '', newRepId: '' });
  const [paymentDuration, setPaymentDuration] = useState('1');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    package: '',
    repId: ''
  });

  // Paystack Config for the selected customer
  const paystackConfig = useMemo(() => ({
    reference: paymentReference || `REF-${Date.now()}`,
    email: selectedCustomer?.email || '',
    phone: selectedCustomer?.phone || '',
    amount: Math.round((selectedPackage?.price || 0) * Number(paymentDuration || 1) * 100),
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    currency: 'KES',
    metadata: {
      customerId: selectedCustomer?.id || '',
      customerName: selectedCustomer?.name || '',
      repId: userProfile?.uid || '',
      repName: userProfile?.name || 'Admin',
      duration: Number(paymentDuration || 1),
      packageId: selectedPackage?.name || '',
      packageName: selectedPackage?.name || '',
      packagePrice: selectedPackage?.price || 0,
      packageSpeed: selectedPackage?.speed || '',
      custom_fields: [
        { display_name: "Customer Name", variable_name: "customer_name", value: selectedCustomer?.name || '' },
        { display_name: "Rep Name", variable_name: "rep_name", value: userProfile?.name || 'Admin' },
        { display_name: "Selected Package", variable_name: "package", value: selectedPackage?.name || '' }
      ]
    }
  }), [selectedCustomer, selectedPackage, paymentDuration, userProfile, paymentReference]);

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleInitializePayment = () => {
    if (!selectedCustomer?.email) {
      toast.error('Customer email is required for payment');
      return;
    }
    if (!selectedPackage?.price || selectedPackage.price <= 0) {
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
        // Clear selection
        setSelectedCustomer(null);
        setSelectedPackage(null);
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
    // Find the package object from the packages list
    const currentPkgName = customer.currentPackage || customer.package;
    const pkg = packages.find(p => p.name === currentPkgName);
    setSelectedPackage(pkg || (packages.length > 0 ? packages[0] : null));
    setPaymentDuration('1');
    setPaymentReference(`REF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    // Listen to customers
    const qCust = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Listen to sales reps for assignment
    const qReps = query(collection(db, 'users'), where('role', '==', 'salesrep'));
    const unsubReps = onSnapshot(qReps, (snap) => {
      setReps(snap.docs.map(d => ({ 
        id: d.id, 
        name: d.data().name,
        email: d.data().email 
      })));
    });

    // Listen to packages
    const qPkgs = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsubPkgs = onSnapshot(qPkgs, (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        name: d.data().name,
        price: d.data().price,
        speed: d.data().speed
      }));
      setPackages(data);
      if (data.length > 0 && !formData.package) {
        setFormData(prev => ({ ...prev, package: data[0].name }));
      }
    });

    return () => {
      unsubCust();
      unsubReps();
      unsubPkgs();
    };
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if email already exists
      const qEmail = query(collection(db, 'customers'), where('email', '==', formData.email.toLowerCase().trim()));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        throw new Error('A customer with this email address is already registered.');
      }

      const selectedRep = reps.find(r => r.id === formData.repId);
      const pkg = packages.find(p => p.name === formData.package);
      
      const customerData = {
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        address: formData.address,
        currentPackage: pkg?.name || '',
        currentSpeed: pkg?.speed || '',
        currentPrice: pkg?.price || 0,
        repId: formData.repId || null,
        repName: selectedRep?.name || 'Unassigned',
        status: 'inactive', // Always inactive until payment
        createdAt: serverTimestamp(),
        subscriptionStart: null,
        expiryDate: null
      };

      await addDoc(collection(db, 'customers'), customerData);

      // Notify customer (No expiry date yet)
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/customers/send-welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            packageName: pkg?.name,
            price: pkg?.price,
            speed: pkg?.speed
          })
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }

      // Notify if a rep was assigned during creation
      if (selectedRep) {
        try {
          await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/customers/notify-reassignment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerEmail: formData.email,
              customerName: formData.name,
              repEmail: selectedRep.email,
              repName: selectedRep.name
            })
          });
        } catch (err) {
          console.error('Failed to send assignment notification:', err);
        }
      }

      await addDoc(collection(db, 'logs'), {
        action: 'customer_created_admin',
        adminId: userProfile.uid,
        adminName: userProfile.name,
        text: `Admin created and assigned customer ${formData.name} to ${selectedRep?.name}`,
        timestamp: serverTimestamp()
      });

      toast.success('Customer created and assigned');
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', package: packages[0]?.name || '', repId: '' });
    } catch (err) {
      toast.error('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = (customerId, currentRepName) => {
    const customer = customers.find(c => c.id === customerId);
    setReassignData({
      customerId,
      customerName: customer?.name || '',
      currentRepId: customer?.repId || '',
      currentRepName: currentRepName || 'Unassigned',
      newRepId: ''
    });
    setIsReassignModalOpen(true);
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignData.newRepId) return toast.error('Please select a new Sales Rep');
    
    setIsSubmitting(true);
    const newRep = reps.find(r => r.id === reassignData.newRepId);
    const customer = customers.find(c => c.id === reassignData.customerId);

    try {
      await updateDoc(doc(db, 'customers', reassignData.customerId), {
        repId: reassignData.newRepId,
        repName: newRep.name
      });

      // Send Notifications
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/customers/notify-reassignment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: customer.email,
            customerName: customer.name,
            repEmail: newRep.email,
            repName: newRep.name
          })
        });
      } catch (err) {
        console.error('Failed to send reassignment notification:', err);
      }

      toast.success(`Customer reassigned to ${newRep.name}. Notifications sent.`);
      setIsReassignModalOpen(false);
    } catch (err) {
      toast.error('Failed to reassign customer: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    if (customers.length === 0) return toast.error('No data to export');
    
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Package', 'Status', 'Rep Name', 'Expiry Date'];
    const csvData = filtered.map(c => [
      c.name,
      c.email,
      c.phone,
      `"${c.address?.replace(/"/g, '""')}"`,
      c.currentPackage || c.package || 'N/A',
      c.status,
      c.repName || 'Unassigned',
      c.expiryDate?.toDate ? c.expiryDate.toDate().toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ISP_Customer_Database_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting customer database...');
  };

  const filtered = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customer Database</h1>
          <p>Manage ISP customers and assign them to your sales team.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} /> Export List
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search customers by name or phone..." 
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
            <h3>No Customers Yet</h3>
            <p>Ready to start onboarding? Use the button above to add your first customer.</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Installation Address</th>
                  <th>Selected Package</th>
                  <th>Status</th>
                  <th>Assigned Rep</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{c.phone}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <MapPin size={12} /> {c.address}
                      </div>
                    </td>
                    <td><span className="badge badge-info">{c.currentPackage || c.package || 'Not Selected'}</span></td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>{c.repName}</span>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handleReassign(c.id, c.repName)}
                        >
                          Reassign
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {c.status === 'inactive' ? (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => openPaymentModal(c)}
                        >
                          <CreditCard size={14} /> Pay Now
                        </button>
                      ) : (
                        <button 
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--accent)' }}
                          onClick={() => openPaymentModal(c)}
                        >
                          <RotateCcw size={14} /> Renew
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Register & Assign Customer</h2>
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
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Enter the 9 digits after 254
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Installation Address</label>
                <textarea className="form-textarea" rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Internet Package</label>
                  <select className="form-select" value={formData.package} onChange={e => setFormData({ ...formData, package: e.target.value })} required>
                    <option value="">-- Select Package --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} - {p.speed} (KES {p.price?.toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Sales Rep (Optional)</label>
                  <select className="form-select" value={formData.repId} onChange={e => setFormData({ ...formData, repId: e.target.value })}>
                    <option value="">-- No Rep / Assign Later --</option>
                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => !isSubmitting && setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Customer'}
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
                    value={selectedPackage?.id}
                    onChange={e => {
                      const pkg = packages.find(p => p.id === e.target.value);
                      setSelectedPackage(pkg);
                    }}
                  >
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
                <span style={{ color: '#111827' }}>KES {selectedPackage?.price?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                <span>Duration:</span>
                <span style={{ color: '#111827' }}>{paymentDuration} {Number(paymentDuration) === 1 ? 'Month' : 'Months'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #e5e7eb', paddingTop: '16px' }}>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>Total to Pay:</span>
                <span style={{ fontWeight: '800', fontSize: '24px', color: '#059669' }}>KES {((selectedPackage?.price || 0) * Number(paymentDuration)).toLocaleString()}</span>
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
                    <><CreditCard size={18} /> Pay KES {((selectedPackage?.price || 0) * Number(paymentDuration || 1)).toLocaleString()}</>
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

      {isReassignModalOpen && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setIsReassignModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(var(--accent-rgb), 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UserSquare2 size={32} color="var(--accent)" />
              </div>
              <h3>Reassign Sales Rep</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Customer: <strong>{reassignData.customerName}</strong><br/>
                Current Rep: {reassignData.currentRepName}
              </p>
            </div>

            <form onSubmit={handleReassignSubmit}>
              <div className="form-group">
                <label className="form-label">Select New Sales Representative</label>
                <select 
                  className="form-select"
                  required
                  value={reassignData.newRepId}
                  onChange={e => setReassignData({ ...reassignData, newRepId: e.target.value })}
                >
                  <option value="">-- Choose New Rep --</option>
                  {reps.filter(r => r.id !== reassignData.currentRepId).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsReassignModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

