import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import React, { useState } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear?: () => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className = "",
}: DateRangePickerProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startInput, setStartInput] = useState(startDate);
  const [endInput, setEndInput] = useState(endDate);

  // Validate date format YYYY-MM-DD
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return true;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !Number.isNaN(date.getTime());
  };

  // Check if end date is before start date
  const isEndBeforeStart = (): boolean => {
    if (!startDate || !endDate) return false;
    return new Date(endDate) < new Date(startDate);
  };

  const handleStartDateChange = (value: string) => {
    setStartInput(value);
    if (isValidDate(value)) {
      onStartDateChange(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndInput(value);
    if (isValidDate(value)) {
      onEndDateChange(value);
    }
  };

  const handleClear = () => {
    setStartInput("");
    setEndInput("");
    onStartDateChange("");
    onEndDateChange("");
    if (onClear) onClear();
  };

  const hasError = isEndBeforeStart();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-normal mb-2 block text-[#333333]">
            Start Date
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={startInput}
              onChange={(e) => handleStartDateChange(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={`pr-10 h-9 rounded-md border-gray-300 font-normal ${
                hasError ? "border-red-500 focus:border-red-500" : ""
              }`}
            />
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setStartOpen(true)}
                >
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <input
                  type="date"
                  value={startInput}
                  onChange={(e) => {
                    handleStartDateChange(e.target.value);
                    setStartOpen(false);
                  }}
                  className="p-2 border-0 focus:outline-none font-normal"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label className="text-sm font-normal mb-2 block text-[#333333]">
            End Date
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={endInput}
              onChange={(e) => handleEndDateChange(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={`pr-10 h-9 rounded-md border-gray-300 font-normal ${
                hasError ? "border-red-500 focus:border-red-500" : ""
              }`}
            />
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setEndOpen(true)}
                >
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <input
                  type="date"
                  value={endInput}
                  onChange={(e) => {
                    handleEndDateChange(e.target.value);
                    setEndOpen(false);
                  }}
                  className="p-2 border-0 focus:outline-none font-normal"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="text-sm text-red-600 font-normal">
          End date cannot be before start date
        </p>
      )}

      {(startDate || endDate) && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-8 text-xs font-normal rounded-md"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
