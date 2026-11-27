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

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Unable to reach the server right now. Please try again in a moment.';
  }

  return msg;
}
