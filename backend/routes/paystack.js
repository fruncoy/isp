const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db, admin } = require('../config/firebaseAdmin');
const { sendEmail } = require('../config/brevo');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// POST /api/paystack/initialize
router.post('/initialize', async (req, res) => {
  const { email, amount, customerId, packageId, repId } = req.body;

  if (!email || !amount || !customerId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in kobo/cents
        metadata: {
          customerId,
          packageId,
          repId,
          custom_fields: [
            { display_name: "Customer ID", variable_name: "customer_id", value: customerId },
            { display_name: "Package ID", variable_name: "package_id", value: packageId }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json(response.data.data);
  } catch (err) {
    console.error('Paystack initialization error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// GET /api/paystack/verify/:reference
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  console.log(`[Paystack] Verifying transaction: ${reference}`);

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === 'success') {
      const metadata = data.metadata || {};
      const { customerId, customerName, repId, repName, duration, packageId, packageName, packagePrice, packageSpeed } = metadata;
      const amount = data.amount / 100;

      if (!customerId) {
        // Fallback: try to find customer by email if metadata is lost
        const customerByEmail = await db.collection('customers').where('email', '==', data.customer.email).limit(1).get();
        if (customerByEmail.empty) {
          return res.status(400).json({ status: 'error', message: 'Could not associate payment with any customer' });
        }
        var targetCustomerId = customerByEmail.docs[0].id;
        var targetCustomerName = customerByEmail.docs[0].data().name;
      } else {
        var targetCustomerId = customerId;
        var targetCustomerName = customerName;
      }

      // 1. Record Payment in Firestore
      const paymentData = {
        customerId: targetCustomerId,
        customerName: targetCustomerName || 'Unknown',
        amount,
        method: data.channel || 'Paystack',
        reference,
        status: 'success',
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        repId: repId || 'System',
        repName: repName || 'System'
      };
      await db.collection('payments').add(paymentData);

      // 2. Record Sale in Firestore
      const saleData = {
        customerId: targetCustomerId,
        customerName: targetCustomerName || 'Unknown',
        package: packageName || packageId || 'Internet Package',
        amount,
        type: 'Subscription',
        duration: Number(duration) || 1,
        repId: repId || 'System',
        repName: repName || 'System',
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('sales').add(saleData);

      // 3. Update Customer Subscription
      const customerDoc = await db.collection('customers').doc(targetCustomerId).get();
      if (customerDoc.exists) {
        const custData = customerDoc.data();
        const monthsToAdd = Number(duration) || 1;
        
        // Calculate new expiry date
        let currentExpiry = custData.expiryDate ? (custData.expiryDate.toDate ? custData.expiryDate.toDate() : new Date(custData.expiryDate)) : new Date();
        // If expired or never had one, start from now
        if (currentExpiry < new Date()) {
          currentExpiry = new Date();
        }
        
        const expiry = new Date(currentExpiry);
        expiry.setMonth(expiry.getMonth() + monthsToAdd);

        const updateData = {
          status: 'active',
          expiryDate: expiry,
          lastPaymentDate: new Date(),
          lastPaymentAmount: amount
        };

        // Update package details if provided in metadata
        if (packageName) updateData.currentPackage = packageName;
        if (packagePrice) updateData.currentPrice = Number(packagePrice);
        if (packageSpeed) updateData.currentSpeed = packageSpeed;

        await db.collection('customers').doc(targetCustomerId).update(updateData);

        // Send Payment Confirmation Email
        try {
          await sendEmail({
            to: custData.email,
            subject: 'Payment Received - Subscription Activated',
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #333;">Payment Successful</h2>
                <p>Hello ${custData.name},</p>
                <p>We have successfully received your payment of <strong>KES ${amount.toLocaleString()}</strong>.</p>
                <p>Your internet service has been activated and is now <strong>Active</strong>.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Package:</strong> ${packageName || custData.currentPackage}</p>
                  <p style="margin: 5px 0;"><strong>New Expiry Date:</strong> ${expiry.toLocaleDateString()}</p>
                  <p style="margin: 5px 0;"><strong>Transaction Ref:</strong> ${reference}</p>
                </div>

                <p>Thank you for your continued support.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error('[Paystack] Email failed:', emailErr.message);
        }
        
        // 4. Create Notification
        await db.collection('notifications').add({
          userId: repId || 'System',
          title: 'Payment Successful',
          message: `Payment of KES ${amount} for customer ${custData.name} was successful.`,
          read: false,
          createdAt: new Date()
        });

        // 5. Log Action for Admin
        await db.collection('logs').add({
          action: 'payment_verified_paystack',
          customerId: targetCustomerId,
          customerName: custData.name,
          amount,
          reference,
          repId: repId || 'System',
          text: `Automated Paystack payment of KES ${amount} verified for ${custData.name}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return res.status(200).json({ status: 'success', message: 'Payment verified and customer activated' });
    } else {
      return res.status(200).json({ status: 'failed', data });
    }
  } catch (err) {
    console.error('Paystack verification error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// POST /api/paystack/webhook
router.post('/webhook', async (req, res) => {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  
  // 1. Verify Signature
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid Signature');
  }

  const event = req.body;
  console.log(`[Paystack Webhook] Received event: ${event.event}`);

  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const { customerId, duration, packageName, packagePrice, packageSpeed, repId, repName } = data.metadata || {};
    const amount = data.amount / 100;

    console.log(`[Paystack Webhook] Processing success for ref: ${reference}`);

    try {
      // Check if already processed (idempotency)
      const existingPayment = await db.collection('payments').where('reference', '==', reference).get();
      if (!existingPayment.empty) {
        console.log(`[Paystack Webhook] Transaction ${reference} already processed.`);
        return res.status(200).send('OK');
      }

      // 1. Record Payment
      await db.collection('payments').add({
        customerId,
        customerName: data.customer?.first_name || 'Customer',
        amount,
        method: data.channel || 'Paystack',
        reference,
        status: 'success',
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        repId: repId || 'System',
        repName: repName || 'System'
      });

      // 2. Record Sale
      await db.collection('sales').add({
        customerId,
        customerName: data.customer?.first_name || 'Customer',
        package: packageName || 'Internet Package',
        amount,
        type: 'Subscription',
        duration: Number(duration) || 1,
        repId: repId || 'System',
        repName: repName || 'System',
        date: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update Customer
      const customerDoc = await db.collection('customers').doc(customerId).get();
      if (customerDoc.exists) {
        const custData = customerDoc.data();
        const monthsToAdd = Number(duration) || 1;
        
        let currentExpiry = custData.expiryDate ? custData.expiryDate.toDate() : new Date();
        if (currentExpiry < new Date()) currentExpiry = new Date();
        
        const expiry = new Date(currentExpiry);
        expiry.setMonth(expiry.getMonth() + monthsToAdd);

        const updateData = {
          status: 'active',
          expiryDate: expiry,
          lastPaymentDate: new Date(),
          lastPaymentAmount: amount
        };

        if (packageName) updateData.currentPackage = packageName;
        if (packagePrice) updateData.currentPrice = Number(packagePrice);
        if (packageSpeed) updateData.currentSpeed = packageSpeed;

        await db.collection('customers').doc(customerId).update(updateData);
        console.log(`[Paystack Webhook] Customer ${customerId} activated via Webhook.`);
      }

      return res.status(200).send('OK');
    } catch (err) {
      console.error('[Paystack Webhook] Error:', err);
      return res.status(500).send('Internal Server Error');
    }
  }

  res.status(200).send('OK');
});

module.exports = router;
