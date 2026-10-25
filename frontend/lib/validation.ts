export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Returns an error message for an invalid chat message, or null when valid.
 * Emptiness is checked on the trimmed text; the length limit applies to the
 * text exactly as typed, so the on-screen counter always matches the rule.
 */
export function validateMessage(raw: string): string | null {
  if (raw.trim().length === 0) {
    return "Please enter a message before sending.";
  }
  if (raw.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long. Please keep it to ${MAX_MESSAGE_LENGTH} characters or fewer (currently ${raw.length}).`;
  }
  return null;
}
