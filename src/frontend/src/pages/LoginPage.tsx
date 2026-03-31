import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  const handleLogin = async () => {
    try {
      await login();
      toast.success("Authentication successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message === "User is already authenticated") {
        toast.error("Already authenticated. Please refresh the page.");
      } else {
        toast.error(
          error.message || "Authentication failed. Please try again.",
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/assets/bms_logo-019d4322-c766-7414-bc34-e217a90db159.png"
              alt="ClearPay Logo"
              className="h-20 w-20"
            />
          </div>
          <div>
            <CardTitle className="text-3xl" style={{ fontWeight: 700 }}>
              <span className="text-[#0078D7]">Clear</span>
              <span className="text-[#555555]">Pay</span>
            </CardTitle>
            <div
              className="text-base text-gray-500 mt-3"
              style={{ fontWeight: 400 }}
            >
              Billing Management System
            </div>
            <p
              className="text-sm text-gray-600 mt-3"
              style={{ fontWeight: 400 }}
            >
              Secure authentication for construction contractors
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-[#28A745] hover:bg-[#218838] text-white rounded-lg py-6 text-base font-semibold"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Login with Internet Identity"
            )}
          </Button>

          <p
            className="text-center text-sm text-gray-600"
            style={{ fontWeight: 400 }}
          >
            Click above to authenticate securely
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
