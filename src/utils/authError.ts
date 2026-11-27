export function formatAuthError(err: unknown): string {
  const rawMsg = err instanceof Error ? err.message : String(err);

  let msg = rawMsg;
  if (rawMsg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMsg) as { error?: string };
      if (parsed.error) msg = parsed.error;
    } catch {
      // Keep raw message if JSON parsing fails
    }
  }

  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Switch to Sign In or use another email.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Incorrect email or password. Please check your details and try again.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'No account found with that email. Create a new profile to join.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Please choose a password with at least 6 characters.';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email & password sign-in needs to be enabled in Firebase Authentication.';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('auth/network-request-failed')) {
    return 'Network error while connecting. Please check your internet connection and retry.';
  }
  if (msg.toLowerCase().includes('insufficient permissions')) {
    return 'This action could not be completed with the current account permissions.';
  }

  return msg;
}
