import { useMasterAdmin } from "../hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { formatPhone } from "../utils/format";

const DEFAULT_ADMIN_NAME = "Seri Jogarao";
const DEFAULT_ADMIN_PHONE = "7575944949";
const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

export function AppHeader() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { isMasterAdmin } = useMasterAdmin();

  // CRITICAL: Only show master admin details if the logged-in user IS the master admin.
  // For all other users, show their own profile data only.
  let displayName: string;
  let displayPhone: string;
  let displayEmail: string;

  if (userProfile) {
    // Profile found — always show the actual user's own details
    displayName = userProfile.fullName || "";
    displayPhone = userProfile.contact ? formatPhone(userProfile.contact) : "";
    displayEmail = userProfile.email || "";
  } else if (isMasterAdmin) {
    // No profile loaded yet but confirmed master admin — show master admin fallback
    displayName = DEFAULT_ADMIN_NAME;
    displayPhone = formatPhone(DEFAULT_ADMIN_PHONE);
    displayEmail = DEFAULT_ADMIN_EMAIL;
  } else {
    // Normal user with profile still loading — show empty
    displayName = "";
    displayPhone = "";
    displayEmail = "";
  }

  return (
    <div className="flex items-center justify-end text-sm text-gray-600 font-normal">
      {displayName && (
        <span className="font-bold text-gray-900">{displayName}</span>
      )}
      {displayName && displayPhone && <span className="mx-2">|</span>}
      {displayPhone && <span>{displayPhone}</span>}
      {displayPhone && displayEmail && <span className="mx-2">|</span>}
      {displayEmail && <span>{displayEmail}</span>}
    </div>
  );
}
