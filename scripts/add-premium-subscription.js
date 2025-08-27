// Script to add premium subscription data to Firestore
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

async function addPremiumSubscription() {
  // Your user ID from the logs
  const userId = 'IidyvJK1oHxgPDmMp21MZjXKBVOv';
  
  const subscriptionData = {
    subscriptionStatus: 'premium',
    lifetimeAccess: true,
    features: {
      webPortal: true,
      aiChat: true,
      podcast: true,
      advancedAnalytics: true
    },
    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
    stripeCustomerId: 'cus_test_premium',
    metadata: {
      paymentAmount: 99,
      currency: 'USD',
      accountVerification: {
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        method: 'google'
      }
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    console.log('Adding premium subscription for user:', userId);
    
    await db.collection('userSubscriptions').doc(userId).set(subscriptionData);
    
    console.log('✅ Premium subscription added successfully!');
    
    // Verify by reading it back
    const doc = await db.collection('userSubscriptions').doc(userId).get();
    if (doc.exists) {
      console.log('✅ Verification: Document exists with data:', doc.data());
    } else {
      console.log('❌ Verification failed: Document not found');
    }
    
  } catch (error) {
    console.error('❌ Error adding subscription:', error);
  }
}

addPremiumSubscription().catch(console.error);