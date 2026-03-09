import { isMasterAdmin } from "@/lib/authAdmin";
import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import { useGetCallerUserProfile, useGetCallerUserRole } from "./useQueries";

/**
 * Hook to fetch accessible projects for the logged-in user
 * Returns empty array (unrestricted access) for Master Admin (email-only check)
 * Returns empty array for Admin role users
 * Returns accessProjects array for normal users only
 */
export function useAccessProjects() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: userRole } = useGetCallerUserRole();

  return useQuery<string[]>({
    queryKey: ["accessProjects", userProfile?.email, userRole],
    queryFn: async () => {
      if (!actor || !userProfile?.email) return [];

      // Master Admin has unrestricted access (email-only check)
      if (isMasterAdmin(userProfile.email)) {
        return [];
      }

      // Admin role users have unrestricted access
      if (userRole === "admin") {
        return [];
      }

      // Normal users: fetch their specific project access
      try {
        const accessProjects = await actor.getUserAccess(userProfile.email);
        return accessProjects;
      } catch (error) {
        console.error("Error fetching user access projects:", error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && !!userProfile?.email,
    staleTime: 30000,
  });
}
