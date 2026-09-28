"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CalendarIcon,
  ChevronDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useIsMobile } from "@/components/hooks/use-mobile";
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

  const isMobile = useIsMobile();

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      onDateChange(day);
      setPopoverOpen(false);
    }
  };

  const handleMonthSelect = (selectedMonth: {
    year: number;
    month: number;
  }) => {
    onMonthChange(selectedMonth);
    setMonthPopoverOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      onDateRangeChange({ from: range.from, to: range.to });
      if (range.from && range.to) {
        setRangePopoverOpen(false);
      }
    }
  };

  const monthsList = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const [tempYear, setTempYear] = useState(month.year);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-fit shrink-0">
        {(["day", "month", "custom"] as PeriodType[]).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={periodType === type}
            onClick={() => onPeriodTypeChange(type)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 sm:flex-auto",
              periodType === type && "bg-background text-foreground shadow-sm",
            )}
          >
            {type === "day" && "Dia"}
            {type === "month" && "Mês"}
            {type === "custom" && "Período"}
          </button>
        ))}
      </div>

      <div className="flex items-center w-full sm:w-auto">
        {periodType === "day" && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full sm:w-[280px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon
                    icon={CalendarIcon}
                    className="mr-2 h-4 w-4 shrink-0"
                  />
                  <span className="truncate">
                    {date
                      ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : "Selecionar dia"}
                  </span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4 shrink-0"
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
                  className="w-full sm:w-[280px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon
                    icon={CalendarIcon}
                    className="mr-2 h-4 w-4 shrink-0"
                  />
                  <span className="truncate">
                    {new Date(month.year, month.month - 1).toLocaleDateString(
                      "pt-BR",
                      { month: "long", year: "numeric" },
                    )}
                  </span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4 shrink-0"
                  />
                </Button>
              }
            />
            <PopoverContent className="w-[280px] p-3" align="start">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTempYear(tempYear - 1)}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
                </Button>
                <div className="font-medium text-sm">{tempYear}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTempYear(tempYear + 1)}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {monthsList.map((m, i) => (
                  <Button
                    key={m}
                    variant={
                      month.year === tempYear && month.month === i + 1
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      handleMonthSelect({ year: tempYear, month: i + 1 })
                    }
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {periodType === "custom" && (
          <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full sm:w-[320px] justify-start text-left font-normal"
                >
                  <HugeiconsIcon
                    icon={CalendarIcon}
                    className="mr-2 h-4 w-4 shrink-0"
                  />
                  <span className="truncate">
                    {dateRange.from && dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })}
                        {" a "}
                        {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : dateRange.from ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })}
                        {" — "}
                        <span className="text-muted-foreground">fim</span>
                      </>
                    ) : (
                      "Selecionar período"
                    )}
                  </span>
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    className="ml-auto h-4 w-4 shrink-0"
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
                numberOfMonths={isMobile ? 1 : 2}
                required={false}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
