import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { format, setMonth, setYear } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "hidden", // Hidden because we use custom Caption
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-border/40 rounded-xl transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-medium text-[0.75rem] uppercase tracking-wider",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/30 [&:has([aria-selected])]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-xl transition-all hover:bg-primary/10 hover:text-primary"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-glow scale-110",
        day_today: "bg-primary/10 text-primary font-black ring-2 ring-primary/20",
        day_outside:
          "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-20",
        day_disabled: "text-muted-foreground opacity-20",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-5 w-5" />,
        Caption: (captionProps) => {
          const { goToMonth, currentMonth } = useNavigation();
          const displayMonth = captionProps.displayMonth;

          const months = Array.from({ length: 12 }, (_, i) => ({
            value: i.toString(),
            label: format(new Date(2024, i, 1), "MMMM"),
          }));

          const years = Array.from({ length: 131 }, (_, i) => ({
            value: (new Date().getFullYear() - 130 + i).toString(),
            label: (new Date().getFullYear() - 130 + i).toString(),
          })).reverse();

          return (
            <div className="flex items-center justify-between w-full px-1 mb-4">
              <div className="flex gap-2">
                <Select
                  value={displayMonth.getMonth().toString()}
                  onValueChange={(value) => {
                    const newMonth = setMonth(displayMonth, parseInt(value));
                    goToMonth(newMonth);
                  }}
                >
                  <SelectTrigger className="h-11 w-[140px] bg-primary/5 hover:bg-primary/10 border-primary/20 font-bold text-sm rounded-xl focus:ring-0 focus:ring-offset-0 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card rounded-[1.5rem] border-border/40 p-2">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-sm py-3 px-4 rounded-xl">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={displayMonth.getFullYear().toString()}
                  onValueChange={(value) => {
                    const newYear = setYear(displayMonth, parseInt(value));
                    goToMonth(newYear);
                  }}
                >
                  <SelectTrigger className="h-11 w-[100px] bg-primary/5 hover:bg-primary/10 border-primary/20 font-bold text-sm rounded-xl focus:ring-0 focus:ring-offset-0 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card rounded-[1.5rem] border-border/40 p-2 max-h-[350px]">
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value} className="text-sm py-3 px-4 rounded-xl">
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
