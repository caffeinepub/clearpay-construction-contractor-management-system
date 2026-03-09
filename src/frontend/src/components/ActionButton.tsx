import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "projects" | "bills" | "payments";
  disabled?: boolean;
  type?: "button" | "submit";
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  type = "button",
}: ActionButtonProps) {
  const baseClasses =
    "h-9 px-3 py-1.5 rounded-lg font-normal text-sm transition-all duration-200 border";

  const variantClasses =
    variant === "primary"
      ? "bg-[#28A745] hover:bg-[#218838] text-white border-[#28A745] hover:border-[#218838] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
      : variant === "projects"
        ? "bg-white hover:bg-[#88CDF6] text-[#333333] border-[#E0E0E0] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
        : variant === "bills"
          ? "bg-white hover:bg-[#FFBE88] text-[#333333] border-[#E0E0E0] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
          : variant === "payments"
            ? "bg-white hover:bg-[#56C596] text-[#333333] border-[#E0E0E0] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
            : "bg-white hover:bg-[#F8F8F8] text-[#333333] border-[#E0E0E0] shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]";

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
