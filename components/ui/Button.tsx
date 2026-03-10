import Link from "next/link";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "ghost";
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
    "bg-dark text-cream hover:bg-dark/90 active:scale-[0.98] transition-transform",
  ghost:
    "bg-transparent text-dark border border-stone/50 hover:border-terracotta hover:text-terracotta active:scale-[0.98] transition-transform",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
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
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded font-medium transition-all duration-200 " +
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
  }
);

Button.displayName = "Button";
