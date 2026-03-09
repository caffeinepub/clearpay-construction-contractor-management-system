import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { formatINR } from "../utils/money";
import { ActionButton } from "./ActionButton";

interface ActionButtonConfig {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "projects" | "bills" | "payments";
  disabled?: boolean;
}

interface PageStickyHeaderProps {
  leftActions: ActionButtonConfig[];
  pageTitle: string;
  totalAmount?: number;
  totalAmountLabel?: string;
}

export function PageStickyHeader({
  leftActions,
  pageTitle,
  totalAmount,
  totalAmountLabel = "Total Amount",
}: PageStickyHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {leftActions.map((action) => (
            <ActionButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              variant={action.variant}
              disabled={action.disabled}
            />
          ))}
        </div>

        {/* Right: Page Title and Total Amount Card */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#333333]">{pageTitle}</h1>
          {totalAmount !== undefined && (
            <Card className="border-2 border-[#FFA500] bg-white shadow-sm">
              <CardContent className="p-3">
                <div className="text-center">
                  <p className="text-xs font-normal text-[#555555] mb-1">
                    {totalAmountLabel}
                  </p>
                  <p className="text-2xl font-bold text-[#28A745]">
                    {formatINR(totalAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
