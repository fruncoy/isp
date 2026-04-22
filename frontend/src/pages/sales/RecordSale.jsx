import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2, Banknote, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function RecordSale() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    packageId: '',
    package: '',
    amount: '',
    type: 'New Install',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // 1. Fetch packages
    const qPackages = query(collection(db, 'packages'), orderBy('price', 'asc'));
    const unsubPackages = onSnapshot(qPackages, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPackages(data);
      setLoadingPackages(false);
    });

    if (!userProfile?.uid) return;
    
    // 2. Fetch customers
    const qCust = query(collection(db, 'customers'), where('repId', '==', userProfile.uid));
    const unsubCust = onSnapshot(qCust, (snap) => {
      const data = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data()
      }));
      setCustomers(data);
    });

    return () => {
      unsubCust();
      unsubPackages();
    };
  }, [userProfile]);

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId);
    setFormData(prev => ({
      ...prev,
      customerId: custId,
      customerName: cust ? cust.name : '',
    }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    let amount = formData.amount;
    let pkgId = formData.packageId;
    let pkgName = formData.package;

    if (type === 'Hardware') {
      amount = 500;
      pkgId = 'hardware_generic';
      pkgName = 'Hardware Replacement';
    } else if (packages.length > 0) {
      amount = packages[0].price;
      pkgId = packages[0].id;
      pkgName = packages[0].name;
    }

    setFormData(prev => ({
      ...prev,
      type,
      amount,
      packageId: pkgId,
      package: pkgName
    }));
  };

  const handlePackageChange = (e) => {
    const pkgId = e.target.value;
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setFormData(prev => ({
        ...prev,
        packageId: pkgId,
        package: pkg.name,
        amount: pkg.price
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) return toast.error('Please select a customer');

    setIsSubmitting(true);
    try {
      // 1. Record Sale
      await addDoc(collection(db, 'sales'), {
        ...formData,
        amount: Number(formData.amount),
        repId: userProfile.uid,
        repName: userProfile.name,
        date: new Date(formData.date),
        createdAt: serverTimestamp()
      });
      
      // 2. Update Customer Doc if it's a service change
      if (formData.type === 'New Install' || formData.type === 'Upgrade') {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);

        await updateDoc(doc(db, 'customers', formData.customerId), {
          currentPackage: selectedPackage?.name || formData.package,
          currentSpeed: selectedPackage?.speed || '',
          currentPrice: Number(formData.amount),
          expiryDate: expiry,
          status: 'active'
        });
      }

      // 3. Log Action
      await addDoc(collection(db, 'logs'), {
        action: 'sale_recorded',
        repId: userProfile.uid,
        repName: userProfile.name,
        text: `Recorded ${formData.type} for ${formData.customerName} (KES ${formData.amount})`,
        timestamp: serverTimestamp()
      });

      toast.success('Sale recorded and customer status updated');
      navigate('/sales/my-customers');
    } catch (err) {
      toast.error('Failed to record sale: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter packages for upgrades
  const currentCustomer = customers.find(c => c.id === formData.customerId);
  const filteredPackages = formData.type === 'Upgrade' 
    ? packages.filter(p => p.name !== currentCustomer?.currentPackage)
    : packages;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Service Transaction</h1>
          <p>Record installations, upgrades, or hardware replacements.</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Customer *</label>
            <select 
              className="form-select"
              required
              value={formData.customerId}
              onChange={handleCustomerChange}
            >
              <option value="">-- Choose a customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.currentPackage ? `(${c.currentPackage})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Transaction Type *</label>
              <select 
                className="form-select"
                value={formData.type}
                onChange={handleTypeChange}
              >
                <option value="New Install">New Installation</option>
                <option value="Upgrade">Package Upgrade</option>
                <option value="Hardware">Hardware Replacement</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                {formData.type === 'Hardware' ? 'Hardware Item' : 'Service Package'} *
              </label>
              {formData.type === 'Hardware' ? (
                <div className="form-input" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={16} /> Generic Router / ONT
                </div>
              ) : (
                <select 
                  className="form-select"
                  value={formData.packageId}
                  onChange={handlePackageChange}
                  disabled={loadingPackages}
                >
                  <option value="">-- Select Package --</option>
                  {filteredPackages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.speed} (KES {p.price?.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Amount (KES) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>KES</span>
                <input 
                  type="number" 
                  className="form-input" 
                  required
                  min="0"
                  step="1"
                  readOnly={formData.type === 'Hardware'}
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  style={{ paddingLeft: '45px', background: formData.type === 'Hardware' ? 'var(--bg-secondary)' : '' }}
                />
              </div>
              {formData.type === 'Hardware' && <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>Standard hardware fee is fixed at KES 500.</p>}
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Transaction Date *</label>
              <input 
                type="date" 
                className="form-input" 
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 -20px 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => navigate('/sales/my-customers')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="spinner-lucide" /> Processing...</> : <><CheckCircle2 size={16} /> Record Transaction</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

