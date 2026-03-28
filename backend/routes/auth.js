const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebaseAdmin');
// const { verifyToken, verifyAdmin } = require('../middleware/verifyToken');

// POST /api/auth/create-rep
// Protected route: Should use verifyToken + verifyAdmin in production
router.post('/create-rep', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Add user profile to Firestore `users` collection with role 'salesrep'
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role: 'salesrep',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ 
      message: 'Sales representative created successfully', 
      uid: userRecord.uid 
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
