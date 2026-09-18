"use client";

import { CalendarIcon, ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PeriodType = "day" | "month" | "custom";

interface PeriodSelectorProps {
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  month: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
}

export function PeriodSelector({
  periodType,
  onPeriodTypeChange,
  date,
  onDateChange,
  month,
  onMonthChange,
  dateRange,
  onDateRangeChange,
}: PeriodSelectorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
  const [dayMonth, setDayMonth] = useState(date);
  const [rangeMonth, setRangeMonth] = useState(dateRange.from || new Date());

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      onDateChange(day);
      setPopoverOpen(false);
    }
  };

  const handleMonthSelect = (day: Date | undefined) => {
    if (day) {
      onMonthChange({ year: day.getFullYear(), month: day.getMonth() + 1 });
      setMonthPopoverOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      onDateRangeChange({ from: range.from, to: range.to });
      if (range.from && range.to) {
        setRangePopoverOpen(false);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(["day", "month", "custom"] as PeriodType[]).map((type) => (
          <Button
            key={type}
            variant={periodType === type ? "default" : "ghost"}
            size="sm"
            onClick={() => onPeriodTypeChange(type)}
            className="capitalize"
          >
            {type === "day" && "Dia"}
            {type === "month" && "Mês"}
            {type === "custom" && "Período"}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {periodType === "day" && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon icon={CalendarIcon} className="mr-2 h-4 w-4" />
                  {date
                    ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : "Selecionar dia"}
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4"
                  />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                month={dayMonth}
                selected={date}
                onMonthChange={setDayMonth}
                captionLayout="dropdown"
                onSelect={handleDaySelect}
              />
            </PopoverContent>
          </Popover>
        )}

        {periodType === "month" && (
          <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon icon={CalendarIcon} className="mr-2 h-4 w-4" />
                  {new Date(month.year, month.month - 1).toLocaleDateString(
                    "pt-BR",
                    {
                      month: "long",
                      year: "numeric",
                    },
                  )}
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4"
                  />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                month={new Date(month.year, month.month - 1)}
                selected={new Date(month.year, month.month - 1)}
                onMonthChange={() => setMonthPopoverOpen(true)}
                captionLayout="dropdown"
                onSelect={handleMonthSelect}
              />
            </PopoverContent>
          </Popover>
        )}

        {periodType === "custom" && (
          <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-[360px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon icon={CalendarIcon} className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                      {" a "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : dateRange.from ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                      {" — "}
                      <span className="text-muted-foreground">
                        selecionar fim
                      </span>
                    </>
                  ) : (
                    "Selecionar período"
                  )}
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4"
                  />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                month={rangeMonth}
                selected={dateRange}
                onMonthChange={(d: Date) => setRangeMonth(d)}
                captionLayout="dropdown"
                onSelect={handleRangeSelect}
                numberOfMonths={2}
                required={false}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
