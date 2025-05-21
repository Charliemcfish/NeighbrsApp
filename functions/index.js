// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase admin with explicit credentials if available
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

// Export all your Stripe functions
exports.createPaymentIntent = stripeService.createPaymentIntent;
exports.capturePayment = stripeService.capturePayment;
exports.createTipPayment = stripeService.createTipPayment;
exports.createStripeCustomer = stripeService.createStripeCustomer;
exports.createSetupIntent = stripeService.createSetupIntent;
exports.createConnectAccount = stripeService.createConnectAccount;
exports.checkConnectAccountStatus = stripeService.checkConnectAccountStatus;
exports.createAccountLink = stripeService.createAccountLink;

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