// Helper module for Master Admin and Admin authorization
const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

/**
 * CRITICAL: Check if user is the Master Admin specifically (email-only check)
 * Master Admin: jogaraoseri.er@mktconstructions.com - always has full access
 */
export function isMasterAdmin(email?: string): boolean {
  if (!email) return false;
  return email === DEFAULT_ADMIN_EMAIL;
}

/**
 * CRITICAL: Check if user can manage (edit/delete/import) data
 * Returns true ONLY for Master Admin (email match) and Admin role users
 */
export function canManageData(email?: string, role?: string): boolean {
  // Master Admin always has full access (email-only check)
  if (isMasterAdmin(email)) {
    return true;
  }

  // Admin role users also have full access
  if (role === "admin") {
    return true;
  }

  return false;
}
