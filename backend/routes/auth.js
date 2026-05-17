const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebaseAdmin');
const { sendEmail } = require('../config/brevo');
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

    // 3. Log Action for Admin (Do this before email to ensure it's recorded)
    try {
      await db.collection('logs').add({
        action: 'sales_rep_created',
        adminId: 'system',
        text: `Created new sales representative: ${name} (${email}). Attempting to send welcome email.`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Activity log created for new sales rep');
    } catch (logErr) {
      console.error('Failed to create activity log:', logErr);
    }

    // 4. Send Welcome Email via Brevo
    try {
      console.log(`Attempting to send welcome email to ${email}...`);
      const emailResult = await sendEmail({
        to: email,
        subject: 'Welcome to ISP Management System',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #333;">Welcome, ${name}</h2>
            <p>You have been added as a Sales Representative to the ISP Management System.</p>
            <p><strong>Your Login Details:</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>Please login and change your password as soon as possible.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
          </div>
        `
      });
      console.log('Welcome email sent successfully:', emailResult?.messageId);
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr);
    }

    // 5. Send final response
    return res.status(201).json({ 
      message: 'Sales representative created successfully', 
      uid: userRecord.uid 
    });
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'A sales representative with this email already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
