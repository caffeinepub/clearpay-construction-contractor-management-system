import { useGetCallerUserProfile } from "../hooks/useQueries";
import { formatPhone } from "../utils/format";

const DEFAULT_ADMIN_NAME = "Seri Jogarao";
const DEFAULT_ADMIN_PHONE = "7575944949";
const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

export function AppHeader() {
  const { data: userProfile } = useGetCallerUserProfile();

  const displayName = userProfile?.fullName || DEFAULT_ADMIN_NAME;
  const displayPhone = userProfile?.contact
    ? formatPhone(userProfile.contact)
    : formatPhone(DEFAULT_ADMIN_PHONE);
  const displayEmail = userProfile?.email || DEFAULT_ADMIN_EMAIL;

  return (
    <div className="flex items-center justify-end text-sm text-gray-600 font-normal">
      <span className="font-bold text-gray-900">{displayName}</span>
      <span className="mx-2">|</span>
      <span>{displayPhone}</span>
      <span className="mx-2">|</span>
      <span>{displayEmail}</span>
    </div>
  );
}
