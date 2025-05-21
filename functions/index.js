// functions/index.js - Updated with more explicit auth handling
const functions = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase admin with explicit auth options
try {
  // If running locally with service account, use it
  const serviceAccount = require('./service_account_key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Initialized Firebase Admin with service account');
} catch (e) {
  // Fall back to default credentials (for deployed functions)
  admin.initializeApp();
  console.log('Initialized Firebase Admin with default credentials');
}

// Log environment variables (excluding sensitive ones)
console.log('Environment variables loaded:', {
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  hasAppUrl: !!process.env.APP_URL,
  NODE_ENV: process.env.NODE_ENV
});

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Import stripe service
const stripeService = require('./stripe');

// Add an auth verification middleware
const verifyAuth = async (context) => {
  // Check if authentication context exists
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Request not authenticated. The function must be called while authenticated.'
    );
  }
  
  try {
    // Verify the token (will throw if invalid)
    await admin.auth().getUser(context.auth.uid);
    console.log(`User authenticated: ${context.auth.uid}`);
    return context.auth.uid;
  } catch (error) {
    console.error(`Auth verification failed for user ${context.auth.uid}:`, error);
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User authentication verification failed'
    );
  }
};

// Wrap stripe functions with auth verification
const wrapWithAuth = (fn) => {
  return async (data, context) => {
    // First verify auth
    const uid = await verifyAuth(context);
    
    // Then execute the actual function
    console.log(`Executing function for user ${uid}`);
    return await fn(data, {...context, uid});
  };
};

// Export all your Stripe functions with auth wrapper
exports.createPaymentIntent = functions.https.onCall(wrapWithAuth(stripeService.createPaymentIntent));
exports.capturePayment = functions.https.onCall(wrapWithAuth(stripeService.capturePayment));
exports.createTipPayment = functions.https.onCall(wrapWithAuth(stripeService.createTipPayment));
exports.createStripeCustomer = functions.https.onCall(wrapWithAuth(stripeService.createStripeCustomer));
exports.createSetupIntent = functions.https.onCall(wrapWithAuth(stripeService.createSetupIntent));
exports.createConnectAccount = functions.https.onCall(wrapWithAuth(stripeService.createConnectAccount));
exports.checkConnectAccountStatus = functions.https.onCall(wrapWithAuth(stripeService.checkConnectAccountStatus));
exports.createAccountLink = functions.https.onCall(wrapWithAuth(stripeService.createAccountLink));

// Add a webhook handler for Stripe events
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Missing Stripe webhook secret');
    return res.status(500).send('Webhook Error: Missing webhook secret');
  }

  // Verify the event came from Stripe
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Construct the event from the payload and signature
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    console.log(`Webhook received: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
      // Update job status in Firestore based on metadata
      if (paymentIntent.metadata && paymentIntent.metadata.jobId) {
        try {
          await admin.firestore().collection('jobs').doc(paymentIntent.metadata.jobId).update({
            paymentStatus: 'succeeded',
            paymentProcessedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Updated job ${paymentIntent.metadata.jobId} payment status to succeeded`);
        } catch (error) {
          console.error(`Error updating job: ${error.message}`);
        }
      }
      break;
      
    case 'account.updated':
      const account = event.data.object;
      console.log(`Connect account ${account.id} was updated`);
      // Update user account status in Firestore
      try {
        // Find the user with this Connect account ID
        const usersRef = admin.firestore().collection('users');
        const snapshot = await usersRef.where('stripeConnectAccountId', '==', account.id).get();
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          await doc.ref.update({
            stripeConnectOnboardingComplete: 
              account.details_submitted && account.charges_enabled && account.payouts_enabled,
            stripeConnectUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Updated user ${doc.id} Connect account status`);
        } else {
          console.log(`No user found with Connect account ID ${account.id}`);
        }
      } catch (error) {
        console.error(`Error updating user account status: ${error.message}`);
      }
      break;
      
    // Add other event handlers as needed
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a success response to Stripe
  res.json({ received: true });
});

// Add a simple test function to check auth
exports.testAuth = functions.https.onCall(async (data, context) => {
  try {
    // Verify auth
    const uid = await verifyAuth(context);
    
    // If auth verification passes, return success
    return {
      success: true,
      message: 'Authentication successful',
      uid: uid,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Test auth function failed:', error);
    throw error;
  }
});