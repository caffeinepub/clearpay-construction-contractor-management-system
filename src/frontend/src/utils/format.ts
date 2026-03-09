/**
 * Formats a phone number with +91 prefix if not already present
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";

  // Remove any existing +91 or 91 prefix
  let cleaned = phone.replace(/^\+?91/, "").trim();

  // Add +91 prefix
  return `+91 ${cleaned}`;
}
