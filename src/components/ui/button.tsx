import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/styles";
import Spinner from "./Spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        gradient: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-md">
          <span className="absolute inset-0 bg-white/20 transform scale-0 rounded-full transition-transform duration-300 group-active:scale-100" />
        </span>
        
        {loading && (
          <Spinner 
            size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
            colorClass="text-current" 
            className="mr-2" 
          />
        )}
        
        {loading && loadingText ? loadingText : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
