import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FONT = { fontFamily: "Century Gothic, Gothic A1, sans-serif" };

interface AccountLinkPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any;
  onLinked: () => void;
  onNewUser: () => void;
}

export default function AccountLinkPage({
  actor,
  onLinked,
  onNewUser,
}: AccountLinkPageProps) {
  const [email, setEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLink = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!validateEmail(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLinking(true);
    try {
      const linked: boolean = await actor.linkUserByEmail(
        email.trim().toLowerCase(),
      );
      if (linked) {
        toast.success("Account linked successfully. Loading your data...");
        onLinked();
      } else {
        toast.error(
          "No account found with this email. Please check the email or contact the administrator.",
        );
      }
    } catch (err: unknown) {
      console.error("Error linking account:", err);
      const msg = err instanceof Error ? err.message : "Failed to link account";
      // Inactive account error from backend
      if (msg.includes("not active")) {
        toast.error(
          "Your account is not active. Please contact the administrator.",
        );
      } else {
        toast.error("Failed to link account. Please try again.");
      }
    } finally {
      setIsLinking(false);
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
            <CardTitle
              className="text-3xl font-bold"
              style={{ ...FONT, fontWeight: 700 }}
            >
              Welcome to ClearPay
            </CardTitle>
            <CardDescription
              className="text-base mt-2"
              style={{ ...FONT, fontWeight: 400 }}
            >
              Enter the email address registered for your account to continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" style={{ ...FONT, fontWeight: 400 }}>
              Registered Email Address *
            </Label>
            <Input
              id="email"
              data-ocid="account_link.input"
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLinking && handleLink()}
              disabled={isLinking}
              style={{ ...FONT, fontWeight: 400 }}
            />
          </div>

          <Button
            data-ocid="account_link.submit_button"
            onClick={handleLink}
            disabled={isLinking}
            className="w-full bg-[#0078D7] hover:bg-[#005a9e] text-white"
            style={{ ...FONT, fontWeight: 600 }}
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking Account...
              </>
            ) : (
              "Access My Account"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500" style={FONT}>
                or
              </span>
            </div>
          </div>

          <Button
            data-ocid="account_link.secondary_button"
            onClick={onNewUser}
            variant="outline"
            className="w-full"
            style={{ ...FONT, fontWeight: 400 }}
          >
            Create New Account
          </Button>

          <p
            className="text-xs text-center text-gray-500 mt-4"
            style={{ ...FONT, fontWeight: 400 }}
          >
            For help, contact your administrator or call +91 7575 94 4949
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
