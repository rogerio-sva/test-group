import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  tooltip?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
  tooltip,
}: StatCardProps) {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && <InfoTooltip content={tooltip} />}
          </div>
          <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                changeType === "positive" && "text-primary",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-accent",
            iconColor
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
