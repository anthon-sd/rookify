import * as React from "react"
import { cn } from "@/lib/utils"

// Placeholder calendar component - to be implemented with react-day-picker
export type CalendarProps = React.HTMLAttributes<HTMLDivElement>

function Calendar({
  className,
  ...props
}: CalendarProps) {
  return (
    <div
      className={cn("p-3", className)}
      {...props}
    >
      <div className="text-center text-muted-foreground">
        Calendar component - to be implemented
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

