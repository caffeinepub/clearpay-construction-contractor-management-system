import { useMemo } from "react";
import { useActor } from "./useActor";
import { useGetCallerUserProfile } from "./useQueries";

const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

/**
 * Hook to determine if the current logged-in user is the Master Admin.
 *
 * Master Admin is identified ONLY by their profile's email matching the
 * master admin email. This means the profile must be loaded under the
 * caller's real Internet Identity principal.
 *
 * IMPORTANT: We no longer use getDefaultAdminProfile() as a fallback
 * because that would incorrectly treat ALL users as admin (since the
 * master admin profile always exists in the backend).
 *
 * The backend's linkMasterAdminPrincipal() handles the case where the
 * master admin's profile was under a placeholder principal. After linking,
 * getCallerUserProfile() will return the correct master admin profile.
 */
export function useMasterAdmin() {
  const { isFetching: actorFetching } = useActor();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const isMasterAdmin = useMemo(() => {
    if (isFetched && userProfile) {
      return userProfile.email === DEFAULT_ADMIN_EMAIL;
    }
    return false;
  }, [userProfile, isFetched]);

  // isDefaultAdminDetected is now the same as isMasterAdmin.
  // Kept for backwards compatibility with components that reference it.
  const isDefaultAdminDetected = isMasterAdmin;

  return {
    isMasterAdmin,
    isDefaultAdminDetected,
    isLoading: profileLoading || actorFetching,
    isFetched,
  };
}
