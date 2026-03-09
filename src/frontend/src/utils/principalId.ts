/**
 * Generates a safe unique text-based Principal ID
 * Format: PID-<timestamp>-<4chars>
 */
export function generatePrincipalId(): string {
  const timestamp = Date.now().toString();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PID-${timestamp}-${randomChars}`;
}
