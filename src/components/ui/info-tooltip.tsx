import { HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  icon?: "help" | "info";
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  content,
  side = "top",
  icon = "help",
  className,
  iconClassName,
}: InfoTooltipProps) {
  const Icon = icon === "help" ? HelpCircle : Info;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5 transition-colors",
            "text-muted-foreground/70 hover:text-muted-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <Icon className={cn("h-4 w-4", iconClassName)} />
          <span className="sr-only">Mais informacoes</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[280px] text-sm leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export function LabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  required,
  optional,
  className,
}: LabelWithTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {optional && <span className="text-muted-foreground font-normal ml-1">(opcional)</span>}
      </label>
      <InfoTooltip content={tooltip} />
    </div>
  );
}
