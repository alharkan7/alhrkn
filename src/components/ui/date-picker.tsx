"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  triggerClassName?: string;
  icon?: React.ReactNode;
}

export function DatePicker({ date, setDate, triggerClassName, icon }: DatePickerProps) {
  const selectedDate = date ? new Date(date) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setDate(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName}
        >
          {icon}
          <span className="sr-only">Open date picker</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
