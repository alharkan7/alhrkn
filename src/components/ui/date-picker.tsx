"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { cn } from "@/lib/utils"

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  triggerClassName?: string;
  icon?: React.ReactNode;
}

export default function DatePicker({ 
  date, 
  setDate, 
  triggerClassName, 
  icon = <CalendarIcon className="h-4 w-4" /> 
}: DatePickerProps) {
  const selectedDate = date ? new Date(date) : undefined;

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate.toISOString());
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            triggerClassName || "w-[280px] justify-start text-left font-base",
            !date && "text-muted-foreground",
          )}
        >
          {icon}
          {date && !triggerClassName ? (
            <span className="ml-2">{format(new Date(date), "PPP")}</span>
          ) : !triggerClassName ? (
            <span className="text-mtext ml-2">Pick a date</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto !border-0 p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}