import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface MultiSelectFilterProps {
  options: { id: string; label: string }[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  options,
  selectedIds,
  onChange,
  placeholder = "Select items",
}: MultiSelectFilterProps) {
  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return placeholder;
    }

    const selectedLabels = selectedIds
      .map((id) => options.find((opt) => opt.id === id)?.label)
      .filter(Boolean) as string[];

    if (selectedLabels.length === 0) {
      return placeholder;
    }

    // Show all project names comma-separated
    return selectedLabels.join(", ");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white font-normal text-left overflow-hidden"
          title={
            selectedIds.length > 0
              ? selectedIds
                  .map((id) => options.find((opt) => opt.id === id)?.label)
                  .join(", ")
              : placeholder
          }
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={selectedIds.includes(option.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedIds, option.id]);
                  } else {
                    onChange(selectedIds.filter((id) => id !== option.id));
                  }
                }}
              />
              <label
                htmlFor={option.id}
                className="text-sm cursor-pointer flex-1 font-normal"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
