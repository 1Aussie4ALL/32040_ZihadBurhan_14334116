import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "focus-ring inline-flex items-center justify-center rounded-button px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white text-primary border border-primary hover:bg-primary-light",
    danger: "bg-white text-status-immediate border border-status-immediate hover:bg-status-immediate-bg",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
