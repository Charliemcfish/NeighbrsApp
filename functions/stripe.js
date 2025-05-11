// firebase/functions/stripe.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')('sk_test_placeholder');




// Create a payment intent (for holding funds when job starts)
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create a payment intent');
  }

  const { amount, jobId, capture_method } = data;
    const db = admin.firestore();

  try {
    // Get the user's Stripe customer ID from Firestore
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData.stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'You need to set up your payment method first');
    }

    // Create a Payment Intent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'gbp',
      customer: userData.stripeCustomerId,
      capture_method: capture_method || 'manual', // Default to manual for holding payments
      metadata: {
        jobId,
        userId: context.auth.uid
      }
    });

    // Update the job with payment intent information
    await db.collection('jobs').doc(jobId).update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'authorized',
      paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Capture a payment (when job is completed)
exports.capturePayment = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to capture a payment');
  }

  const { paymentIntentId, jobId } = data;

  try {
    // Verify this is the job creator
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    
    if (jobData.createdBy !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only the job creator can release the payment');
    }

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    // Update the job with payment capture information
    await db.collection('jobs').doc(jobId).update({
      paymentStatus: 'captured',
      paymentCapturedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, paymentStatus: paymentIntent.status };
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a tip payment (for tip-only jobs)
exports.createTipPayment = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to send a tip');
  }

  const { amount, helperId, jobId } = data;

  try {
    // Get the user's Stripe customer ID
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData.stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'You need to set up your payment method first');
    }

    // Get the helper's connected account ID
    const helperDoc = await db.collection('users').doc(helperId).get();
    const helperData = helperDoc.data();
    
    if (!helperData.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'The helper has not set up their payment account');
    }

    // Create a Payment Intent for the tip with direct capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'gbp',
      customer: userData.stripeCustomerId,
      transfer_data: {
        destination: helperData.stripeConnectAccountId,
      },
      metadata: {
        jobId,
        userId: context.auth.uid,
        helperId
      }
    });

    // Confirm the payment intent (immediately charge the card)
    await stripe.paymentIntents.confirm(paymentIntent.id);

    // Update the job with tip information
    await db.collection('jobs').doc(jobId).update({
      tipAmount: amount,
      tipPaymentIntentId: paymentIntent.id,
      tipPaidAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating tip payment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a Stripe customer for a user
exports.createStripeCustomer = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to set up a payment method');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Check if the user already has a Stripe customer ID
    if (userData.stripeCustomerId) {
      return { customerId: userData.stripeCustomerId };
    }

    // Create a new customer
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.fullName,
      metadata: {
        firebaseUserId: context.auth.uid
      }
    });

    // Update the user document with the Stripe customer ID
    await db.collection('users').doc(context.auth.uid).update({
      stripeCustomerId: customer.id,
      stripeSetupAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { customerId: customer.id };
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a Setup Intent for adding a payment method
exports.createSetupIntent = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to set up a payment method');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Ensure the user has a Stripe customer ID
    if (!userData.stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'User needs to be a Stripe customer first');
    }

    // Create a setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: userData.stripeCustomerId,
      usage: 'off_session', // Allow using this payment method without the customer present
    });

    return { clientSecret: setupIntent.client_secret };
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a Stripe Connect account for a helper
exports.createConnectAccount = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create a Connect account');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Check if the user already has a Connect account
    if (userData.stripeConnectAccountId) {
      return { 
        accountId: userData.stripeConnectAccountId,
        accountLinkUrl: null 
      };
    }

    // Create a new Connect account (Standard account)
    const account = await stripe.accounts.create({
      type: 'standard',
      email: userData.email,
      metadata: {
        firebaseUserId: context.auth.uid
      }
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://yourapp.com/stripe-connect-refresh?account_id=${account.id}`,
      return_url: `https://yourapp.com/stripe-connect-complete?account_id=${account.id}`,
      type: 'account_onboarding',
    });

    // Update the user document with the Connect account ID
    await db.collection('users').doc(context.auth.uid).update({
      stripeConnectAccountId: account.id,
      stripeConnectSetupAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeConnectOnboardingComplete: false
    });

    return { 
      accountId: account.id,
      accountLinkUrl: accountLink.url
    };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Check the status of a Connect account
exports.checkConnectAccountStatus = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to check your Connect account');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Check if the user has a Connect account ID
    if (!userData.stripeConnectAccountId) {
      return { 
        hasAccount: false,
        accountStatus: null,
        needsOnboarding: true
      };
    }

    // Retrieve the Connect account status
    const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);

    // Check if the account has completed onboarding
    const onboardingComplete = 
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Update the onboarding status if it's complete
    if (onboardingComplete && !userData.stripeConnectOnboardingComplete) {
      await db.collection('users').doc(context.auth.uid).update({
        stripeConnectOnboardingComplete: true
      });
    }

    return {
      hasAccount: true,
      accountStatus: account.details_submitted ? 'complete' : 'incomplete',
      needsOnboarding: !onboardingComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    };
  } catch (error) {
    console.error('Error checking Connect account status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create a new account link for Connect account onboarding
exports.createAccountLink = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create an account link');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    // Check if the user has a Connect account ID
    if (!userData.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'User does not have a Connect account');
    }

    // Create a new account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeConnectAccountId,
      refresh_url: `https://yourapp.com/stripe-connect-refresh?account_id=${userData.stripeConnectAccountId}`,
      return_url: `https://yourapp.com/stripe-connect-complete?account_id=${userData.stripeConnectAccountId}`,
      type: 'account_onboarding',
    });

    return { accountLinkUrl: accountLink.url };
  } catch (error) {
    console.error('Error creating account link:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});