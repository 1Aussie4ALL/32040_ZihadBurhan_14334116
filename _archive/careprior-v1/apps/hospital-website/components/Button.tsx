import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ondark" | "outline-ondark";

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "focus-ring inline-flex items-center justify-center rounded-button px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white text-primary border border-primary hover:bg-primary-light",
    ondark: "bg-white text-primary hover:bg-primary-light",
    "outline-ondark": "bg-transparent text-white border border-white/40 hover:bg-white/10",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
