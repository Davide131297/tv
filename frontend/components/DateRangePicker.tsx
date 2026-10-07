"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { de } from "date-fns/locale";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  type DateRange,
  formatDisplayDate,
  formatIsoDate,
  getDefaultRange,
  parseIsoDate,
  parsePeriod,
} from "@/utils/dateRange";

interface DateRangePickerProps {
  /** Zeitraum-String (siehe utils/dateRange.ts) */
  period: string;
  onChange: (range: DateRange) => void;
  className?: string;
}

export default function DateRangePicker({
  period,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const applied = parsePeriod(period) ?? getDefaultRange();
  const [draft, setDraft] = React.useState<DayPickerRange | undefined>();

  const selected: DayPickerRange = draft ?? {
    from: parseIsoDate(applied.from),
    to: parseIsoDate(applied.to),
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDraft(undefined);
  };

  // Zwei Klicks: erster Klick setzt den Start, zweiter Klick das Ende.
  const handleDayClick = (day: Date) => {
    if (!draft?.from) {
      setDraft({ from: day, to: undefined });
      return;
    }
    const [from, to] =
      day < draft.from ? [day, draft.from] : [draft.from, day];
    onChange({ from: formatIsoDate(from), to: formatIsoDate(to) });
    setDraft(undefined);
    setOpen(false);
  };

  const resetToDefault = () => {
    onChange(getDefaultRange());
    setDraft(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start font-normal", className)}
        >
          <CalendarIcon className="size-4" />
          {formatDisplayDate(applied.from)} – {formatDisplayDate(applied.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          locale={de}
          weekStartsOn={1}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          defaultMonth={selected.from}
          selected={selected}
          onDayClick={handleDayClick}
          numberOfMonths={1}
        />
        <div className="flex justify-end border-t p-2">
          <Button variant="ghost" size="sm" onClick={resetToDefault}>
            Aktuelles Jahr
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
