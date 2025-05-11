const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase first
admin.initializeApp();

// Import stripe service AFTER Firebase is initialized
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



// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


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