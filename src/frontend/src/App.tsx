import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import MainLayout from "./components/MainLayout";
import { NavigationProvider } from "./context/NavigationContext";
import { ShortcutProvider } from "./context/ShortcutContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useMasterAdmin } from "./hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import AccountLinkPage from "./pages/AccountLinkPage";
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
  const { isMasterAdmin } = useMasterAdmin();

  const [bypassProfileSetup, setBypassProfileSetup] = useState(false);
  const [inactiveAccountError, setInactiveAccountError] = useState(false);
  const [showApp, setShowApp] = useState(false);
  // Phase: 'init' | 'link_master' | 'link_email' | 'new_user' | 'done'
  const [linkPhase, setLinkPhase] = useState<
    "init" | "link_master" | "link_email" | "new_user" | "done"
  >("init");
  const linkAttemptedRef = useRef(false);

  const isAuthenticated = !!identity;

  // Ensure dark mode class is never applied
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      localStorage.removeItem("clearpay-theme");
    } catch (_) {
      /* ignore */
    }
  }, []);

  // CRITICAL: Check if user account is active
  useEffect(() => {
    if (isAuthenticated && isFetched && userProfile) {
      const isAdminUser = isMasterAdmin || userProfile.role === "admin";

      if (!isAdminUser && !userProfile.active) {
        console.log("User account is not active");
        setInactiveAccountError(true);
      } else {
        setInactiveAccountError(false);
      }
    }
  }, [isAuthenticated, isFetched, userProfile, isMasterAdmin]);

  // CRITICAL: Profile linking logic
  useEffect(() => {
    if (!isAuthenticated || !actor || actorFetching) return;

    // Profile found under caller's real principal — all good
    if (isFetched && userProfile) {
      if (isMasterAdmin) {
        setBypassProfileSetup(true);
      }
      setLinkPhase("done");
      setShowApp(true);
      return;
    }

    // No profile found — first try master admin linking
    if (isFetched && !userProfile && !linkAttemptedRef.current) {
      linkAttemptedRef.current = true;
      setLinkPhase("link_master");

      actor
        .linkMasterAdminPrincipal()
        .then((linked) => {
          if (linked) {
            // Master admin linked — refetch
            queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
          } else {
            // CRITICAL FIX: Check if profile loaded while we were waiting.
            // If yes, go directly to done instead of showing email link page.
            const cachedProfile = queryClient.getQueryData([
              "currentUserProfile",
            ]);
            if (cachedProfile) {
              setLinkPhase("done");
              setShowApp(true);
            } else {
              // Not master admin — prompt for email to link existing user account
              setLinkPhase("link_email");
            }
          }
        })
        .catch((err) => {
          console.error("Error during master admin linking:", err);
          const cachedProfile = queryClient.getQueryData([
            "currentUserProfile",
          ]);
          if (cachedProfile) {
            setLinkPhase("done");
            setShowApp(true);
          } else {
            setLinkPhase("link_email");
          }
        });
    }

    // Handle profileError case
    if (profileError && !linkAttemptedRef.current) {
      linkAttemptedRef.current = true;
      setLinkPhase("link_email");
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

  // Show app when profile is loaded successfully
  useEffect(() => {
    if (isAuthenticated && isFetched && userProfile && !inactiveAccountError) {
      setLinkPhase("done");
      setShowApp(true);
    }
  }, [isAuthenticated, isFetched, userProfile, inactiveAccountError]);

  // Automatic timeout for loading states (safety net)
  useEffect(() => {
    if (
      isAuthenticated &&
      !showApp &&
      !inactiveAccountError &&
      linkPhase === "init"
    ) {
      const timeoutId = setTimeout(() => {
        console.log("Loading timeout reached - showing email link screen");
        setLinkPhase("link_email");
      }, 10000);

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, showApp, inactiveAccountError, linkPhase]);

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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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

  // Show email linking screen for regular users who have an existing account
  if (linkPhase === "link_email" && actor) {
    return (
      <AccountLinkPage
        actor={actor}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["accessProjects"] });
          setLinkPhase("link_master");
        }}
        onNewUser={() => {
          setLinkPhase("new_user");
        }}
      />
    );
  }

  // Show profile setup for genuinely new users
  if (linkPhase === "new_user") {
    return (
      <ProfileSetupPage
        onBypass={() => {
          setBypassProfileSetup(true);
          setShowApp(true);
        }}
      />
    );
  }

  // Legacy fallback: show ProfileSetupPage if bypassed flag not set and no profile
  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    isFetched &&
    userProfile === null &&
    !bypassProfileSetup &&
    !isMasterAdmin &&
    linkPhase === "done";

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

  if (
    !showApp &&
    (actorFetching || profileLoading || linkPhase === "link_master")
  ) {
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

  return (
    <NavigationProvider>
      <ShortcutProvider>
        <MainLayout />
        <Toaster />
      </ShortcutProvider>
    </NavigationProvider>
  );
}

export default App;
