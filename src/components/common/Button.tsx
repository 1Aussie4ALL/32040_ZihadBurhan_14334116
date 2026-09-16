import { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300",
  secondary: "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300",
  outline: "border border-slate-300 text-slate-900 bg-white hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkButtonProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & { href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(base, VARIANT_CLASSES[variant], SIZE_CLASSES[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
});

export function LinkButton({ variant = "primary", size = "md", fullWidth, className, ...props }: LinkButtonProps) {
  return (
    <Link
      className={clsx(base, VARIANT_CLASSES[variant], SIZE_CLASSES[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
