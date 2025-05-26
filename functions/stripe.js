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

// In functions/stripe.js - Replace the createPaymentIntent function
// Fixed to use only transfer_data (recommended approach)

exports.createPaymentIntent = async (data, context) => {
  console.log('createPaymentIntent called with data:', JSON.stringify(data));
  
  // Ensure the user is authenticated
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

    // Get the job details to find the helper
    console.log(`Getting job details for job ${jobId}`);
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      console.error('Job document not found:', jobId);
      throw new functions.https.HttpsError('not-found', 'Job document not found');
    }
    
    const jobData = jobDoc.data();
    
    if (!jobData.helperAssigned) {
      console.error('No helper assigned to job:', jobId);
      throw new functions.https.HttpsError('failed-precondition', 'No helper assigned to this job');
    }

    // Get the helper's Connect account
    console.log(`Getting helper ${jobData.helperAssigned} Connect account`);
    const helperDoc = await db.collection('users').doc(jobData.helperAssigned).get();
    
    if (!helperDoc.exists) {
      console.error('Helper document not found:', jobData.helperAssigned);
      throw new functions.https.HttpsError('not-found', 'Helper document not found');
    }
    
    const helperData = helperDoc.data();
    
    if (!helperData.stripeConnectAccountId) {
      console.error('Helper has no Connect account:', jobData.helperAssigned);
      throw new functions.https.HttpsError('failed-precondition', 'Helper has not set up their payment account');
    }

    // Get the user's default payment method
    console.log(`Getting payment methods for customer ${userData.stripeCustomerId}`);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userData.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      console.error('No payment methods found for customer');
      throw new functions.https.HttpsError('failed-precondition', 'You need to add a payment method first');
    }

    const defaultPaymentMethod = paymentMethods.data[0];
    console.log(`Using payment method: ${defaultPaymentMethod.id}`);
    
    console.log(`Creating payment intent for amount ${amount} with transfer to ${helperData.stripeConnectAccountId}`);
    
    // Calculate amounts in cents
    const amountInCents = Math.round(amount * 100);
    
    // Option 1: Transfer all funds to helper (no platform fee)
    // Use this if you don't want to take a platform fee
    const paymentIntentData = {
      amount: amountInCents,
      currency: 'usd',
      customer: userData.stripeCustomerId,
      payment_method: defaultPaymentMethod.id,
      capture_method: capture_method || 'manual',
      confirmation_method: 'manual',
      confirm: true,
      return_url: 'https://neighbrs-app.firebaseapp.com/return',
      // Transfer all funds to helper
      transfer_data: {
        destination: helperData.stripeConnectAccountId,
      },
      metadata: {
        jobId,
        userId: uid,
        helperId: jobData.helperAssigned,
        originalAmount: amount
      }
    };

    // Option 2: If you want to take a platform fee, use this instead:
    // Uncomment the lines below and comment out the transfer_data above
    /*
    const platformFeePercent = 0.05; // 5% platform fee - adjust as needed
    const platformFeeInCents = Math.round(amountInCents * platformFeePercent);
    
    paymentIntentData.application_fee_amount = platformFeeInCents;
    paymentIntentData.transfer_data = {
      destination: helperData.stripeConnectAccountId,
    };
    paymentIntentData.metadata.platformFee = platformFeeInCents / 100;
    paymentIntentData.metadata.helperReceives = (amountInCents - platformFeeInCents) / 100;
    */
    
    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    
    console.log('Payment intent created and confirmed:', paymentIntent.id);
    console.log('Payment intent status:', paymentIntent.status);
    console.log('Transfer destination:', helperData.stripeConnectAccountId);

    // Update the job with payment intent information
    await db.collection('jobs').doc(jobId).update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status === 'requires_capture' ? 'authorized' : paymentIntent.status,
      paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      helperStripeAccountId: helperData.stripeConnectAccountId,
      transferAmount: amount, // Full amount goes to helper (no platform fee in this version)
      platformFee: 0
    });
    
    console.log('Job updated with payment intent and transfer info');

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      transferDestination: helperData.stripeConnectAccountId,
      transferAmount: amount
    };
  } catch (error) {
    logFunctionError('createPaymentIntent', error, context, data);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      throw new functions.https.HttpsError('failed-precondition', `Card error: ${error.message}`);
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new functions.https.HttpsError('invalid-argument', `Invalid request: ${error.message}`);
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
};

// In functions/stripe.js - Replace the capturePayment function

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
    
    console.log(`Retrieving payment intent ${paymentIntentId}`);
    
    // First, retrieve the payment intent to check its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Payment intent status:', paymentIntent.status);
    
    let finalPaymentIntent;
    
    if (paymentIntent.status === 'requires_capture') {
      // Payment intent is ready to be captured
      console.log('Capturing payment intent');
      finalPaymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    } else if (paymentIntent.status === 'succeeded') {
      // Payment has already been captured
      console.log('Payment intent already captured');
      finalPaymentIntent = paymentIntent;
    } else if (paymentIntent.status === 'requires_payment_method' || 
               paymentIntent.status === 'requires_confirmation') {
      // Payment intent needs to be confirmed first
      console.log('Payment intent requires confirmation, attempting to confirm');
      try {
        finalPaymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        
        // If it's now requires_capture, capture it
        if (finalPaymentIntent.status === 'requires_capture') {
          console.log('Now capturing confirmed payment intent');
          finalPaymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
        }
      } catch (confirmError) {
        console.error('Error confirming payment intent:', confirmError);
        throw new functions.https.HttpsError('failed-precondition', 
          `Payment could not be processed: ${confirmError.message}`);
      }
    } else {
      console.error('Payment intent in unexpected status:', paymentIntent.status);
      throw new functions.https.HttpsError('failed-precondition', 
        `Payment cannot be captured. Current status: ${paymentIntent.status}`);
    }
    
    console.log('Final payment status:', finalPaymentIntent.status);

    // Update the job with payment capture information
    await db.collection('jobs').doc(jobId).update({
      paymentStatus: finalPaymentIntent.status,
      paymentCapturedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Job updated as payment captured');

    return { 
      success: true, 
      paymentStatus: finalPaymentIntent.status,
      paymentIntentId: finalPaymentIntent.id
    };
  } catch (error) {
    logFunctionError('capturePayment', error, context, data);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      throw new functions.https.HttpsError('failed-precondition', error.message);
    }
    
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

// In functions/stripe.js - Replace the checkConnectAccountStatus function

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
    
    // Allow checking another user's account status if userId is provided
    // This is useful for job creators to verify helper payment setup
    const targetUserId = data.userId || uid;
    console.log('Checking Connect account status for user:', targetUserId);
    
    // Get user data for the target user
    const userDoc = await db.collection('users').doc(targetUserId).get();
    
    if (!userDoc.exists) {
      console.error('User document not found:', targetUserId);
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

    // Update the onboarding status if it's complete and we're checking our own account
    if (onboardingComplete && !userData.stripeConnectOnboardingComplete && targetUserId === uid) {
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

// Add this to functions/stripe.js - New function to verify payment transfers

exports.verifyPaymentTransfer = async (data, context) => {
  console.log('verifyPaymentTransfer called');
  
  const uid = context.uid;
  if (!uid) {
    throw new functions.https.HttpsError('internal', 'UID not provided');
  }

  const { paymentIntentId } = data;
  
  try {
    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Payment Intent Status:', paymentIntent.status);
    console.log('Payment Intent Amount:', paymentIntent.amount / 100);
    
    // Check for transfers
    const transfers = await stripe.transfers.list({
      destination: paymentIntent.transfer_data?.destination,
      limit: 10,
    });
    
    console.log('Transfers found:', transfers.data.length);
    
    const relatedTransfer = transfers.data.find(transfer => 
      transfer.source_transaction === paymentIntent.charges?.data[0]?.id
    );
    
    if (relatedTransfer) {
      console.log('Transfer found:', {
        id: relatedTransfer.id,
        amount: relatedTransfer.amount / 100,
        destination: relatedTransfer.destination,
        created: new Date(relatedTransfer.created * 1000),
        status: relatedTransfer.status || 'completed'
      });
    }
    
    // Get destination account info
    if (paymentIntent.transfer_data?.destination) {
      const account = await stripe.accounts.retrieve(paymentIntent.transfer_data.destination);
      console.log('Destination account:', {
        id: account.id,
        email: account.email,
        type: account.type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      });
    }
    
    return {
      paymentStatus: paymentIntent.status,
      transferFound: !!relatedTransfer,
      transferAmount: relatedTransfer ? relatedTransfer.amount / 100 : 0,
      destinationAccount: paymentIntent.transfer_data?.destination || null
    };
    
  } catch (error) {
    console.error('Error verifying payment transfer:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
};