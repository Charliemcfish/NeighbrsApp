// functions/index.js - Final fix: Allow unauthenticated Cloud Run invocation
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');
require('dotenv').config();

// IMPORTANT: Set global options to allow unauthenticated invocation at Cloud Run level
// Firebase will still handle authentication at the function level
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

// Initialize Firebase admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./service_account_key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Initialized Firebase Admin with service account');
  } catch (e) {
    admin.initializeApp();
    console.log('Initialized Firebase Admin with default credentials');
  }
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('./stripe');

// Auth check function - Firebase level authentication
const checkAuth = (request) => {
  console.log('=== FIREBASE AUTH CHECK ===');
  console.log('Request auth exists:', !!request.auth);
  
  if (request.auth) {
    console.log('✅ Firebase auth context found');
    console.log('UID:', request.auth.uid);
    console.log('Email:', request.auth.token?.email);
  } else {
    console.log('❌ No Firebase auth context');
  }
  
  console.log('=== END AUTH CHECK ===');
  
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated with Firebase');
  }
  
  return request.auth.uid;
};

// Test function - allows unauthenticated Cloud Run invocation but requires Firebase auth
exports.testAuth = onCall({
  // No authentication required at Cloud Run level
  // Firebase handles auth through request.auth
}, (request) => {
  try {
    console.log('=== TEST AUTH FUNCTION ===');
    console.log('Function called successfully');
    
    const uid = checkAuth(request);
    
    return {
      success: true,
      uid: uid,
      message: 'Firebase authentication successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('testAuth failed:', error);
    throw error;
  }
});

// All Stripe functions with the same pattern
exports.createStripeCustomer = onCall({}, async (request) => {
  try {
    console.log('createStripeCustomer called');
    const uid = checkAuth(request);
    return await stripeService.createStripeCustomer(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createStripeCustomer failed:', error);
    throw error;
  }
});

exports.checkConnectAccountStatus = onCall({}, async (request) => {
  try {
    console.log('checkConnectAccountStatus called');
    const uid = checkAuth(request);
    return await stripeService.checkConnectAccountStatus(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('checkConnectAccountStatus failed:', error);
    throw error;
  }
});

exports.createConnectAccount = onCall({}, async (request) => {
  try {
    console.log('createConnectAccount called');
    const uid = checkAuth(request);
    return await stripeService.createConnectAccount(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createConnectAccount failed:', error);
    throw error;
  }
});

exports.createAccountLink = onCall({}, async (request) => {
  try {
    console.log('createAccountLink called');
    const uid = checkAuth(request);
    return await stripeService.createAccountLink(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createAccountLink failed:', error);
    throw error;
  }
});

exports.createPaymentIntent = onCall({}, async (request) => {
  try {
    console.log('createPaymentIntent called');
    const uid = checkAuth(request);
    return await stripeService.createPaymentIntent(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createPaymentIntent failed:', error);
    throw error;
  }
});

exports.capturePayment = onCall({}, async (request) => {
  try {
    console.log('capturePayment called');
    const uid = checkAuth(request);
    return await stripeService.capturePayment(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('capturePayment failed:', error);
    throw error;
  }
});

exports.createTipPayment = onCall({}, async (request) => {
  try {
    console.log('createTipPayment called');
    const uid = checkAuth(request);
    return await stripeService.createTipPayment(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createTipPayment failed:', error);
    throw error;
  }
});

exports.createSetupIntent = onCall({}, async (request) => {
  try {
    console.log('createSetupIntent called');
    const uid = checkAuth(request);
    return await stripeService.createSetupIntent(request.data, {auth: {uid}, uid});
  } catch (error) {
    console.error('createSetupIntent failed:', error);
    throw error;
  }
});

// Webhook handler
exports.stripeWebhook = onRequest({
  cors: true,
}, async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Missing Stripe webhook secret');
    return res.status(500).send('Webhook Error: Missing webhook secret');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    console.log(`Webhook received: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
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
      try {
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
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});