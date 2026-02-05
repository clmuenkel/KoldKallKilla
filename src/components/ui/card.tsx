import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10",
        elevated: "bg-card shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl",
        outlined: "bg-transparent border-2 hover:border-primary/50",
        interactive: [
          "bg-card shadow-sm cursor-pointer",
          "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-md",
        ],
        ghost: "bg-transparent border-transparent shadow-none hover:bg-muted/50",
        gradient: "bg-gradient-to-br from-card to-muted/30 shadow-sm hover:shadow-md",
      },
      accent: {
        none: "",
        left: "border-l-4 border-l-primary",
        top: "border-t-4 border-t-primary",
        success: "border-l-4 border-l-emerald-500",
        warning: "border-l-4 border-l-amber-500",
        danger: "border-l-4 border-l-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
      accent: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, accent, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, accent }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
