import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import MainLayout from "./components/MainLayout";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useMasterAdmin } from "./hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import LoginPage from "./pages/LoginPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";

function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    error: profileError,
  } = useGetCallerUserProfile();
  const { isMasterAdmin, isDefaultAdminDetected } = useMasterAdmin();

  const [bypassProfileSetup, setBypassProfileSetup] = useState(false);
  const [inactiveAccountError, setInactiveAccountError] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const linkAttemptedRef = useRef(false);

  const isAuthenticated = !!identity;

  // CRITICAL: Check if user account is active
  useEffect(() => {
    if (isAuthenticated && isFetched && userProfile) {
      // Master Admin and Admin role users are always active
      const isAdminUser = isMasterAdmin || userProfile.role === "admin";

      if (!isAdminUser && !userProfile.active) {
        console.log("User account is not active");
        setInactiveAccountError(true);
      } else {
        setInactiveAccountError(false);
      }
    }
  }, [isAuthenticated, isFetched, userProfile, isMasterAdmin]);

  // CRITICAL: Master Admin principal linking + bypass logic
  useEffect(() => {
    if (!isAuthenticated || !actor || actorFetching) return;

    // Profile found under caller's real principal - all good
    if (isFetched && userProfile) {
      if (isMasterAdmin) {
        console.log("Master admin detected - bypassing all profile checks");
        setBypassProfileSetup(true);
        setShowApp(true);
      }
      return;
    }

    // Profile not found under caller principal - try linking master admin
    if (isFetched && !userProfile && !linkAttemptedRef.current) {
      linkAttemptedRef.current = true;
      console.log(
        "No profile found - attempting master admin principal linking...",
      );

      actor
        .linkMasterAdminPrincipal()
        .then((linked) => {
          if (linked) {
            console.log(
              "Master admin principal linked successfully - refetching profile...",
            );
            // Invalidate and refetch profile so useMasterAdmin picks up the new profile
            queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
          } else {
            // Not master admin or profile already exists - check getDefaultAdminProfile
            return actor.getDefaultAdminProfile().then((defaultAdmin) => {
              if (
                defaultAdmin &&
                defaultAdmin.email === "jogaraoseri.er@mktconstructions.com"
              ) {
                console.log(
                  "Master admin detected via default profile - bypassing",
                );
                setBypassProfileSetup(true);
                setShowApp(true);
              } else {
                // Not master admin - auto bypass after short delay
                setTimeout(() => {
                  console.log("Profile not found - bypassing to app");
                  setBypassProfileSetup(true);
                  setShowApp(true);
                }, 2000);
              }
            });
          }
        })
        .catch((err) => {
          console.error("Error during principal linking:", err);
          // Fallback: check default admin profile
          actor
            .getDefaultAdminProfile()
            .then((defaultAdmin) => {
              if (
                defaultAdmin &&
                defaultAdmin.email === "jogaraoseri.er@mktconstructions.com"
              ) {
                setBypassProfileSetup(true);
                setShowApp(true);
              } else {
                setTimeout(() => {
                  setBypassProfileSetup(true);
                  setShowApp(true);
                }, 2000);
              }
            })
            .catch(() => {
              setTimeout(() => {
                setBypassProfileSetup(true);
                setShowApp(true);
              }, 2000);
            });
        });
    }

    // Handle profileError case
    if (profileError && !linkAttemptedRef.current) {
      linkAttemptedRef.current = true;
      actor
        .getDefaultAdminProfile()
        .then((defaultAdmin) => {
          if (
            defaultAdmin &&
            defaultAdmin.email === "jogaraoseri.er@mktconstructions.com"
          ) {
            console.log(
              "Master admin detected via default profile (error fallback)",
            );
            setBypassProfileSetup(true);
            setShowApp(true);
          } else {
            setTimeout(() => {
              setBypassProfileSetup(true);
              setShowApp(true);
            }, 3000);
          }
        })
        .catch(() => {
          setTimeout(() => {
            setBypassProfileSetup(true);
            setShowApp(true);
          }, 2000);
        });
    }
  }, [
    isAuthenticated,
    actor,
    actorFetching,
    isFetched,
    userProfile,
    profileError,
    isMasterAdmin,
    queryClient,
  ]);

  // CRITICAL: Show app when profile is loaded successfully (after linking or normal load)
  useEffect(() => {
    if (isAuthenticated && isFetched && userProfile && !inactiveAccountError) {
      setShowApp(true);
    }
  }, [isAuthenticated, isFetched, userProfile, inactiveAccountError]);

  // CRITICAL: Show app if detected as master admin via default profile check
  useEffect(() => {
    if (isDefaultAdminDetected && isAuthenticated) {
      setBypassProfileSetup(true);
      setShowApp(true);
    }
  }, [isDefaultAdminDetected, isAuthenticated]);

  // CRITICAL: Automatic timeout for loading states
  useEffect(() => {
    if (isAuthenticated && !showApp && !inactiveAccountError) {
      const timeoutId = setTimeout(() => {
        console.log("Loading timeout reached - automatically showing app");
        setBypassProfileSetup(true);
        setShowApp(true);
      }, 10000); // 10 second maximum wait

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, showApp, inactiveAccountError]);

  // Optimized loading state for initial authentication
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D7] mx-auto mb-4" />
          <p
            className="text-gray-600 font-normal"
            style={{ fontFamily: "Century Gothic, Gothic A1, sans-serif" }}
          >
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // CRITICAL: Show inactive account error
  if (inactiveAccountError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                role="img"
                aria-label="Error"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2
            className="text-xl font-bold text-gray-900 mb-2"
            style={{ fontFamily: "Century Gothic, Gothic A1, sans-serif" }}
          >
            Account Not Active
          </h2>
          <p
            className="text-gray-600 mb-6"
            style={{
              fontFamily: "Century Gothic, Gothic A1, sans-serif",
              fontWeight: 400,
            }}
          >
            Your account is not active. Please contact the administrator.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-[#0078D7] text-white rounded-md hover:bg-[#005a9e] transition-colors font-normal"
            style={{ fontFamily: "Century Gothic, Gothic A1, sans-serif" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // CRITICAL: Master Admin should NEVER see any blocking screens
  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    isFetched &&
    userProfile === null &&
    !bypassProfileSetup &&
    !isMasterAdmin &&
    !isDefaultAdminDetected;

  if (showProfileSetup) {
    return (
      <ProfileSetupPage
        onBypass={() => {
          setBypassProfileSetup(true);
          setShowApp(true);
        }}
      />
    );
  }

  // Show loading only if we haven't shown the app yet and we're still fetching
  if (!showApp && (actorFetching || profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D7] mx-auto mb-4" />
          <p
            className="text-gray-600 font-normal"
            style={{ fontFamily: "Century Gothic, Gothic A1, sans-serif" }}
          >
            {actorFetching ? "Connecting..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // All checks passed or bypassed - show main app
  return (
    <>
      <MainLayout />
      <Toaster />
    </>
  );
}

export default App;
