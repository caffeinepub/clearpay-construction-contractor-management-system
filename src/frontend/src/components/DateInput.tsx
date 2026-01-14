import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function DateInput({ 
  id, 
  value, 
  onChange, 
  placeholder = 'dd-mm-yyyy', 
  required = false,
  className = '',
  disabled = false
}: DateInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Parse value to set initial display month and selected date
  useEffect(() => {
    if (value) {
      const [day, month, year] = value.split('-').map(Number);
      if (day && month && year) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setDisplayMonth(date);
        }
      }
    }
  }, [value]);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(displayMonth.getMonth() + 1).padStart(2, '0');
    const yearStr = displayMonth.getFullYear();
    onChange(`${dayStr}-${monthStr}-${yearStr}`);
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(displayMonth.getFullYear(), parseInt(monthIndex), 1);
    setDisplayMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), displayMonth.getMonth(), 1);
    setDisplayMonth(newDate);
  };

  const goToPreviousMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(displayMonth);
    const days: React.ReactElement[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      currentDate.setHours(0, 0, 0, 0);
      const isToday = currentDate.getTime() === today.getTime();
      const isSunday = currentDate.getDay() === 0;
      const isSelected = selectedDate && 
        currentDate.getDate() === selectedDate.getDate() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getFullYear() === selectedDate.getFullYear();

      let buttonClass = 'h-9 w-9 rounded-md text-sm font-normal hover:bg-gray-100 transition-colors';
      
      if (isSelected) {
        buttonClass = 'h-9 w-9 rounded-md text-sm font-bold bg-blue-500 text-white hover:bg-blue-600';
      } else if (isToday) {
        buttonClass = 'h-9 w-9 rounded-md text-sm font-bold bg-green-500 text-white hover:bg-green-600';
      } else if (isSunday) {
        buttonClass = 'h-9 w-9 rounded-md text-sm font-bold bg-red-500 text-white hover:bg-red-600';
      }

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={buttonClass}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`pr-10 ${className}`}
      />
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
            onClick={() => setIsCalendarOpen(true)}
          >
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            {/* Month and Year Selectors */}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-2 flex-1">
                <Select value={displayMonth.getMonth().toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="h-8 text-sm font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()} className="text-sm font-normal">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={displayMonth.getFullYear().toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-8 text-sm font-normal w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()} className="text-sm font-normal">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="h-9 w-9 flex items-center justify-center text-xs font-bold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
