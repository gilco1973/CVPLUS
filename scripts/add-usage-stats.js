// Script to add usage stats data to Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin (for emulator)
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
  });
}

// Set emulator host for Firestore
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8090';
const db = admin.firestore();

async function addUsageStats() {
  // Your user ID from the logs
  const userId = 'IidyvJK1oHxgPDmMp21MZjXKBVOv';
  
  const usageData = {
    currentMonthUploads: 2,
    uniqueCVsThisMonth: 2,
    remainingUploads: 'unlimited',
    monthlyLimit: 'unlimited',
    uniqueCVLimit: 'unlimited',
    currentMonth: new Date().toISOString().substring(0, 7), // YYYY-MM format
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    console.log('Adding usage stats for user:', userId);
    
    await db.collection('userUsage').doc(userId).set(usageData);
    
    console.log('✅ Usage stats added successfully!');
    
    // Verify by reading it back
    const doc = await db.collection('userUsage').doc(userId).get();
    if (doc.exists) {
      console.log('✅ Verification: Document exists with data:', doc.data());
    } else {
      console.log('❌ Verification failed: Document not found');
    }
    
  } catch (error) {
    console.error('❌ Error adding usage stats:', error);
  }
}

addUsageStats().catch(console.error);