import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "gradient-primary text-white hover:opacity-90 hover:shadow-glow active:scale-[0.98]",
        destructive: "bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 active:scale-[0.98]",
        outline: "border-2 border-emerald-600 dark:border-emerald-500 bg-transparent text-emerald-600 dark:text-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white active:scale-[0.98]",
        secondary: "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-slate-600 active:scale-[0.98]",
        ghost: "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-gray-100",
        link: "text-emerald-600 dark:text-emerald-500 underline-offset-4 hover:underline",
        whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-dark hover:shadow-glow active:scale-[0.98]",
        hero: "gradient-hero text-white shadow-elevated hover:shadow-glow hover:opacity-95 active:scale-[0.98] font-bold",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
