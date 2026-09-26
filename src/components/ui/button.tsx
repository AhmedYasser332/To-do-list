import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    const variantStyles = {
      default: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
      secondary: 'bg-[#F2F2EE] text-primaryText-light hover:bg-[#E8E8E2] dark:bg-[#2A2A2A] dark:text-primaryText-dark dark:hover:bg-[#333333]',
      outline: 'border border-border-light bg-transparent hover:bg-[#F2F2EE] text-primaryText-light dark:border-border-dark dark:text-primaryText-dark dark:hover:bg-[#2A2A2A]',
      ghost: 'hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      subtle: 'bg-accent-subtle text-accent hover:bg-[#E2ECF5]',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 rounded-sm px-3 text-xs',
      lg: 'h-10 rounded-md px-6 text-base',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
