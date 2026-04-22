const { db } = require('./config/firebaseAdmin');

async function seed() {
  console.log('Seeding packages...');
  
  const packages = [
    { name: 'Home Basic', speed: '10Mbps', price: 2500, tier: 'Basic' },
    { name: 'Home Standard', speed: '25Mbps', price: 4000, tier: 'Standard' },
    { name: 'Home Premium', speed: '50Mbps', price: 6500, tier: 'Premium' },
  ];

  try {
    // 1. Clear existing packages
    const existing = await db.collection('packages').get();
    const batch = db.batch();
    existing.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('Cleared existing packages.');

    // 2. Add new packages
    for (const p of packages) {
      await db.collection('packages').add({
        ...p,
        createdAt: new Date()
      });
      console.log(`Added package: ${p.name}`);
    }

    // 3. Clear sales and payments as requested ("abolish current")
    const sales = await db.collection('sales').get();
    const sBatch = db.batch();
    sales.forEach(doc => sBatch.delete(doc.ref));
    await sBatch.commit();
    console.log('Cleared sales data.');

    const payments = await db.collection('payments').get();
    const pBatch = db.batch();
    payments.forEach(doc => pBatch.delete(doc.ref));
    await pBatch.commit();
    console.log('Cleared payment data.');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
}

seed();
