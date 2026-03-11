import Link from "next/link";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  href?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-dark text-cream shadow-md hover:shadow-xl hover:bg-dark/90 active:scale-[0.97]",
  secondary:
    "bg-terracotta text-cream shadow-md hover:shadow-xl hover:bg-terracotta/90 active:scale-[0.97]",
  ghost:
    "bg-transparent text-dark border border-stone/50 hover:border-terracotta hover:text-terracotta active:scale-[0.97]",
  outline:
    "bg-transparent text-dark border-2 border-dark hover:bg-dark hover:text-cream active:scale-[0.97]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-3.5 text-base",
  lg: "px-9 py-4.5 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      asChild,
      children,
      className = "",
      href,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream " +
      variantStyles[variant] +
      " " +
      sizeStyles[size];

    if (asChild && href) {
      return (
        <Link href={href} className={`${baseStyles} ${className}`}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
