// functions/stripe.js - Updated with Express onboarding
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Get Stripe secret key from environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Check if Stripe secret is available
if (!STRIPE_SECRET_KEY) {
  console.error('Missing Stripe secret key - payments will not work');
}

// Initialize Stripe with the secret key
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Get Firestore database
const db = admin.firestore();

// Helper function for detailed error logging
const logFunctionError = (functionName, error, context, data) => {
  console.error(`Error in ${functionName}:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    context: {
      auth: context.auth ? {
        uid: context.auth.uid,
        token: context.auth.token ? 'present' : 'missing'
      } : 'not authenticated',
    },
    data: JSON.stringify(data)
  });
};

// Create a payment intent (for holding funds when job starts)
exports.createPaymentIntent = async (data, context) => {
  console.log('createPaymentIntent called with data:', JSON.stringify(data));
  
  // Ensure the user is authenticated - should be handled by index.js now
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createPaymentIntent');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  const { amount, jobId, capture_method } = data;
  
  try {
    console.log(`Getting user ${uid} for createPaymentIntent`);
    // Get the user's Stripe customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeCustomerId) {
      console.error('User has no stripeCustomerId:', uid);
      throw new functions.https.HttpsError('failed-precondition', 'You need to set up your payment method first');
    }
    
    console.log(`Creating payment intent for amount ${amount} for customer ${userData.stripeCustomerId}`);
    
    // Create a Payment Intent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'gbp',
      customer: userData.stripeCustomerId,
      capture_method: capture_method || 'manual', // Default to manual for holding payments
      metadata: {
        jobId,
        userId: uid
      }
    });
    
    console.log('Payment intent created:', paymentIntent.id);

    // Update the job with payment intent information
    await db.collection('jobs').doc(jobId).update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'authorized',
      paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Job updated with payment intent');

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    logFunctionError('createPaymentIntent', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Capture a payment (when job is completed)
exports.capturePayment = async (data, context) => {
  console.log('capturePayment called with data:', JSON.stringify(data));
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to capturePayment');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  const { paymentIntentId, jobId } = data;

  try {
    // Verify this is the job creator
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      console.error('Job document not found:', jobId);
      throw new functions.https.HttpsError('not-found', 'Job document not found');
    }
    
    const jobData = jobDoc.data();
    
    if (jobData.createdBy !== uid) {
      console.error('Permission denied: user is not job creator');
      throw new functions.https.HttpsError('permission-denied', 'Only the job creator can release the payment');
    }
    
    console.log(`Capturing payment intent ${paymentIntentId}`);

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    console.log('Payment captured:', paymentIntent.id);

    // Update the job with payment capture information
    await db.collection('jobs').doc(jobId).update({
      paymentStatus: 'captured',
      paymentCapturedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Job updated as payment captured');

    return { success: true, paymentStatus: paymentIntent.status };
  } catch (error) {
    logFunctionError('capturePayment', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Create a tip payment (for tip-only jobs)
exports.createTipPayment = async (data, context) => {
  console.log('createTipPayment called with data:', JSON.stringify(data));
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createTipPayment');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  const { amount, helperId, jobId } = data;

  try {
    // Get the user's Stripe customer ID
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();
    
    if (!userData.stripeCustomerId) {
      console.error('User has no stripeCustomerId:', uid);
      throw new functions.https.HttpsError('failed-precondition', 'You need to set up your payment method first');
    }

    // Get the helper's connected account ID
    const helperDoc = await db.collection('users').doc(helperId).get();
    
    if (!helperDoc.exists) {
      console.error('Helper document not found:', helperId);
      throw new functions.https.HttpsError('not-found', 'Helper document not found');
    }
    
    const helperData = helperDoc.data();
    
    if (!helperData.stripeConnectAccountId) {
      console.error('Helper has no stripeConnectAccountId:', helperId);
      throw new functions.https.HttpsError('failed-precondition', 'The helper has not set up their payment account');
    }
    
    console.log(`Creating tip payment of ${amount} for helper ${helperId}`);

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
        userId: uid,
        helperId
      }
    });
    
    console.log('Tip payment intent created:', paymentIntent.id);

    // Confirm the payment intent (immediately charge the card)
    await stripe.paymentIntents.confirm(paymentIntent.id);
    console.log('Tip payment confirmed');

    // Update the job with tip information
    await db.collection('jobs').doc(jobId).update({
      tipAmount: amount,
      tipPaymentIntentId: paymentIntent.id,
      tipPaidAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Job updated with tip information');

    return { success: true };
  } catch (error) {
    logFunctionError('createTipPayment', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Create a Stripe customer for a user
exports.createStripeCustomer = async (data, context) => {
  console.log('createStripeCustomer called for user:', context.uid);
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createStripeCustomer');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  try {
    // Print more details about the auth context for debugging
    console.log('Auth context:', {
      uid: uid,
      token: context.auth && context.auth.token ? 'present' : 'missing',
    });
    
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();

    // Check if the user already has a Stripe customer ID
    if (userData.stripeCustomerId) {
      console.log('User already has a Stripe customer ID:', userData.stripeCustomerId);
      return { customerId: userData.stripeCustomerId };
    }

    // Create a new customer
    console.log('Creating new Stripe customer for user:', userData.email);
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.fullName,
      metadata: {
        firebaseUserId: uid
      }
    });
    
    console.log('Stripe customer created:', customer.id);

    // Update the user document with the Stripe customer ID
    await db.collection('users').doc(uid).update({
      stripeCustomerId: customer.id,
      stripeSetupAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('User document updated with Stripe customer ID');

    return { customerId: customer.id };
  } catch (error) {
    logFunctionError('createStripeCustomer', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Create a Setup Intent for adding a payment method
exports.createSetupIntent = async (data, context) => {
  console.log('createSetupIntent called for user:', context.uid);
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createSetupIntent');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();

    // Ensure the user has a Stripe customer ID
    if (!userData.stripeCustomerId) {
      console.error('User has no stripeCustomerId:', uid);
      throw new functions.https.HttpsError('failed-precondition', 'User needs to be a Stripe customer first');
    }

    // Create a setup intent
    console.log('Creating setup intent for customer:', userData.stripeCustomerId);
    const setupIntent = await stripe.setupIntents.create({
      customer: userData.stripeCustomerId,
      usage: 'off_session', // Allow using this payment method without the customer present
    });
    
    console.log('Setup intent created:', setupIntent.id);

    return { clientSecret: setupIntent.client_secret };
  } catch (error) {
    logFunctionError('createSetupIntent', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Create a Stripe Connect Express account for a helper
exports.createConnectAccount = async (data, context) => {
  console.log('createConnectAccount called for user:', context.uid);
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createConnectAccount');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();

    // Check if the user already has a Connect account
    if (userData.stripeConnectAccountId) {
      console.log('User already has a Connect account:', userData.stripeConnectAccountId);
      return { 
        accountId: userData.stripeConnectAccountId,
        accountLinkUrl: null 
      };
    }

    // Create a new Connect Express account
    console.log('Creating new Stripe Connect Express account for:', userData.email);
    const account = await stripe.accounts.create({
      type: 'express', // Changed from 'standard' to 'express'
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Set to individual for faster onboarding
      individual: {
        email: userData.email,
        first_name: userData.fullName ? userData.fullName.split(' ')[0] : '',
        last_name: userData.fullName ? userData.fullName.split(' ').slice(1).join(' ') : '',
      },
      metadata: {
        firebaseUserId: uid
      }
    });
    
    console.log('Connect Express account created:', account.id);

    // Create an account link for Express onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL || `https://neighbrs-app.firebaseapp.com/stripe-connect-refresh?account_id=${account.id}`,
      return_url: process.env.STRIPE_CONNECT_RETURN_URL || `https://neighbrs-app.firebaseapp.com/stripe-connect-complete?account_id=${account.id}`,
      type: 'account_onboarding',
      collect: 'eventually_due', // This makes onboarding faster by only collecting essential info initially
    });
    
    console.log('Account link created for Express onboarding');

    // Update the user document with the Connect account ID
    await db.collection('users').doc(uid).update({
      stripeConnectAccountId: account.id,
      stripeConnectSetupAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeConnectOnboardingComplete: false,
      stripeConnectAccountType: 'express' // Track that this is an Express account
    });
    
    console.log('User document updated with Connect Express account ID');

    return { 
      accountId: account.id,
      accountLinkUrl: accountLink.url
    };
  } catch (error) {
    logFunctionError('createConnectAccount', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Check the status of a Connect account
exports.checkConnectAccountStatus = async (data, context) => {
  console.log('checkConnectAccountStatus called for user:', context.uid);
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to checkConnectAccountStatus');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  try {
    // Print more details about the auth context for debugging
    console.log('Auth context in checkConnectAccountStatus:', {
      uid: uid,
      token: context.auth && context.auth.token ? 'present' : 'missing',
    });
    
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();

    // Check if the user has a Connect account ID
    if (!userData.stripeConnectAccountId) {
      console.log('User has no Connect account');
      return { 
        hasAccount: false,
        accountStatus: null,
        needsOnboarding: true,
        accountType: null
      };
    }

    // Retrieve the Connect account status
    console.log('Retrieving Connect account status for:', userData.stripeConnectAccountId);
    const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);
    console.log('Connect account retrieved, details_submitted:', account.details_submitted);

    // For Express accounts, check if they can accept payments
    const canAcceptPayments = account.charges_enabled && account.payouts_enabled;
    
    // Check if the account has completed onboarding
    const onboardingComplete = 
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;
    
    console.log('Onboarding complete?', onboardingComplete);
    console.log('Can accept payments?', canAcceptPayments);

    // Update the onboarding status if it's complete
    if (onboardingComplete && !userData.stripeConnectOnboardingComplete) {
      console.log('Updating user document with onboarding complete status');
      await db.collection('users').doc(uid).update({
        stripeConnectOnboardingComplete: true
      });
    }

    return {
      hasAccount: true,
      accountStatus: canAcceptPayments ? 'complete' : 'incomplete',
      needsOnboarding: !onboardingComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountType: account.type, // Will be 'express' for Express accounts
      detailsSubmitted: account.details_submitted,
      requirementsOverdue: account.requirements?.currently_due?.length > 0,
      requirements: account.requirements
    };
  } catch (error) {
    logFunctionError('checkConnectAccountStatus', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// Create a new account link for Connect account onboarding
exports.createAccountLink = async (data, context) => {
  console.log('createAccountLink called for user:', context.uid);
  
  // Ensure the user is authenticated
  const uid = context.uid;
  if (!uid) {
    console.error('No uid provided to createAccountLink');
    throw new functions.https.HttpsError('internal', 'UID not provided to function');
  }

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', uid);
      throw new functions.https.HttpsError('not-found', 'User document not found');
    }
    
    const userData = userDoc.data();

    // Check if the user has a Connect account ID
    if (!userData.stripeConnectAccountId) {
      console.error('User has no Connect account ID:', uid);
      throw new functions.https.HttpsError('failed-precondition', 'User does not have a Connect account');
    }

    // Create a new account link for Express onboarding
    console.log('Creating account link for Connect account:', userData.stripeConnectAccountId);
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeConnectAccountId,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL || `https://neighbrs-app.firebaseapp.com/stripe-connect-refresh?account_id=${userData.stripeConnectAccountId}`,
      return_url: process.env.STRIPE_CONNECT_RETURN_URL || `https://neighbrs-app.firebaseapp.com/stripe-connect-complete?account_id=${userData.stripeConnectAccountId}`,
      type: 'account_onboarding',
      collect: 'eventually_due', // This makes the process faster
    });
    
    console.log('Account link created');

    return { accountLinkUrl: accountLink.url };
  } catch (error) {
    logFunctionError('createAccountLink', error, context, data);
    throw new functions.https.HttpsError('internal', error.message);
  }
};