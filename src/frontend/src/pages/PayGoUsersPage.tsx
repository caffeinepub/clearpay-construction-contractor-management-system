import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, UserCog } from "lucide-react";

const GREEN = "#28A745";

export default function PayGoUsersPage() {
  return (
    <div className="p-6">
      <Card className="border-l-4" style={{ borderLeftColor: GREEN }}>
        <CardHeader>
          <CardTitle
            style={{ color: GREEN }}
            className="flex items-center gap-2"
          >
            <UserCog className="h-5 w-5" />
            PayGo Users (Admin Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="rounded-full p-6" style={{ background: "#f0fff4" }}>
              <Lock className="h-12 w-12" style={{ color: GREEN }} />
            </div>
            <p className="text-gray-600 text-center max-w-sm">
              PayGo User Management is handled through the ClearPay Users
              module. Switch to <strong>ClearPay</strong> mode to manage users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
