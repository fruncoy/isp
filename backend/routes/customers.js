const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebaseAdmin');
const { sendEmail } = require('../config/brevo');

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

// POST /api/customers/send-welcome
router.post('/send-welcome', async (req, res) => {
  const { email, name, packageName, price, speed } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }

  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Our ISP Services',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Welcome, ${name}</h2>
          <p>Thank you for choosing our ISP services. Your account has been successfully registered.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Your Selected Package:</h3>
            <p style="margin: 5px 0;"><strong>Package:</strong> ${packageName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Speed:</strong> ${speed || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Monthly Price:</strong> KES ${price?.toLocaleString() || '0'}</p>
          </div>

          <p><strong>Note:</strong> Your service will be activated once your first payment is processed.</p>
          <p>We are committed to providing you with the best internet experience.</p>
          <p>If you have any questions, please contact your sales representative or our support team.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
        </div>
      `
    });

    // Log the successful email
    await db.collection('logs').add({
      action: 'email_welcome_sent',
      customerEmail: email,
      customerName: name,
      text: `Welcome email sent to customer: ${name} (${email}) with package details.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Welcome email sent' });
  } catch (err) {
    console.error('Error sending customer welcome email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/customers/send-reminder
router.post('/send-reminder', async (req, res) => {
  const { email, name, expiryDate } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }

  try {
    await sendEmail({
      to: email,
      subject: 'Subscription Renewal Reminder',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Subscription Reminder</h2>
          <p>Hello ${name},</p>
          <p>This is a friendly reminder that your internet subscription is scheduled to expire on <strong>${expiryDate}</strong>.</p>
          <p>To ensure uninterrupted service, please make a payment before the expiry date.</p>
          <p>You can contact your sales representative to initiate the payment via Paystack.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
        </div>
      `
    });

    // Log the successful reminder
    await db.collection('logs').add({
      action: 'email_reminder_sent',
      customerEmail: email,
      customerName: name,
      text: `Subscription renewal reminder sent to ${name} (${email}) for expiry on ${expiryDate}.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Reminder email sent' });
  } catch (err) {
    console.error('Error sending reminder email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/customers/notify-reassignment
router.post('/notify-reassignment', async (req, res) => {
  const { customerEmail, customerName, repEmail, repName } = req.body;

  try {
    // 1. Notify Customer
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: 'Your Sales Representative has been Updated',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #333;">Hello ${customerName},</h2>
            <p>We wanted to inform you that your assigned sales representative has been updated.</p>
            <p>Your new representative is <strong>${repName}</strong>.</p>
            <p>They will be your primary point of contact for any service requests or payments.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
          </div>
        `
      });
    }

    // 2. Notify Sales Rep
    if (repEmail) {
      await sendEmail({
        to: repEmail,
        subject: 'New Customer Assigned to You',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #333;">Hello ${repName},</h2>
            <p>You have been assigned a new customer: <strong>${customerName}</strong>.</p>
            <p>Please log in to your portal to view the customer details and manage their subscription.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
          </div>
        `
      });
    }

    // Log the reassignment notification
    await db.collection('logs').add({
      action: 'email_reassignment_sent',
      customerEmail,
      repEmail,
      text: `Reassignment notification sent: Customer ${customerName} assigned to Rep ${repName}.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Notifications sent successfully' });
  } catch (err) {
    console.error('Error sending reassignment notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

module.exports = router;
