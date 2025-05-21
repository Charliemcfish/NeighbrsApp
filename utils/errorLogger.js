// utils/errorLogger.js
export const logError = (source, error) => {
  console.error(`[${source}] Error details:`, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    details: error.details || 'No additional details',
    name: error.name,
    // Add any additional properties that might be useful
    additionalInfo: error.additionalInfo || error.info || error.data
  });
  
  // If this is a Firebase error, log additional Firebase-specific info
  if (error.code && (error.code.startsWith('auth/') || error.code.includes('firebase'))) {
    console.error(`[${source}] Firebase error:`, {
      firebaseCode: error.code,
      firebaseMessage: error.message
    });
  }
};