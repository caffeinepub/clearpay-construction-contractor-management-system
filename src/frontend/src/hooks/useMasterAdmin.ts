import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useActor } from "./useActor";
import { useGetCallerUserProfile } from "./useQueries";

const DEFAULT_ADMIN_EMAIL = "jogaraoseri.er@mktconstructions.com";

/**
 * Hook to determine if the current user is the Master Admin.
 * Master Admin is identified by email match on their profile.
 *
 * CRITICAL: Also checks getDefaultAdminProfile() as a fallback when
 * the caller's profile is null (e.g. after canister upgrade where the
 * master admin profile was stored under placeholder "2vxsx-fae" and
 * linkMasterAdminPrincipal() hasn't been called yet, or when profile
 * refetch is in progress after linking).
 */
export function useMasterAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  // Fallback: check the canister's default admin profile when caller has no profile
  const { data: defaultAdminProfile, isFetched: defaultAdminFetched } =
    useQuery({
      queryKey: ["defaultAdminProfile"],
      queryFn: async () => {
        if (!actor) return null;
        return actor.getDefaultAdminProfile();
      },
      enabled: !!actor && !actorFetching && isFetched && !userProfile,
      staleTime: 30000,
      retry: 1,
    });

  const isMasterAdmin = useMemo(() => {
    // Profile found under caller principal - check by email
    if (isFetched && userProfile) {
      return userProfile.email === DEFAULT_ADMIN_EMAIL;
    }
    return false;
  }, [userProfile, isFetched]);

  // isDefaultAdminDetected: true when default admin profile exists (even if not linked to caller yet)
  // Used to bypass profile setup screen and show the app
  const isDefaultAdminDetected = useMemo(() => {
    if (isMasterAdmin) return true;
    if (defaultAdminFetched && defaultAdminProfile) {
      return defaultAdminProfile.email === DEFAULT_ADMIN_EMAIL;
    }
    return false;
  }, [isMasterAdmin, defaultAdminProfile, defaultAdminFetched]);

  return {
    isMasterAdmin,
    isDefaultAdminDetected,
    isLoading: profileLoading || actorFetching,
    isFetched,
  };
}
