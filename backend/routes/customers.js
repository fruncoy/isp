const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { repId } = req.query;
    let queryRef = db.collection('customers');
    
    if (repId) {
      queryRef = queryRef.where('repId', '==', repId);
    }
    
    const snapshot = await queryRef.orderBy('createdAt', 'desc').get();
    const customers = [];
    
    snapshot.forEach(doc => {
      customers.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const docRef = db.collection('customers').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
