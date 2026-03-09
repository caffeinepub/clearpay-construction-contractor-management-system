import { Trash } from "lucide-react";

interface BulkDeleteButtonProps {
  count: number;
  onClick: () => void;
}

export function BulkDeleteButton({ count, onClick }: BulkDeleteButtonProps) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#D32F2F] text-white rounded-md hover:bg-[#B71C1C] transition-colors text-sm font-normal shadow-sm"
    >
      <Trash className="h-4 w-4" />
      Bulk Delete ({count})
    </button>
  );
}
