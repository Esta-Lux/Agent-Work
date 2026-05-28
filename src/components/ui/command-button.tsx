import type { ButtonHTMLAttributes, ReactNode } from "react";

export type CommandButtonVariant = "primary" | "secondary" | "ghost";
export type CommandButtonSize = "sm" | "md" | "lg";
export type CommandButtonTheme = "admin" | "workspace";

interface CommandButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: CommandButtonVariant;
  size?: CommandButtonSize;
  theme?: CommandButtonTheme;
  label: string;
  icon?: ReactNode;
  loading?: boolean;
}

const sizeClasses: Record<CommandButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm"
};

const variantClasses: Record<CommandButtonTheme, Record<CommandButtonVariant, string>> = {
  admin: {
    primary: "bg-black text-white hover:bg-zinc-800",
    secondary: "border border-border-admin bg-transparent text-text-admin-2 hover:bg-zinc-50",
    ghost: "text-text-admin-3 hover:text-text-admin-1 hover:bg-zinc-50"
  },
  workspace: {
    primary: "bg-signal text-white hover:bg-signal-bright",
    secondary: "border border-border-ws bg-transparent text-text-ws-2 hover:bg-white/5",
    ghost: "text-text-ws-3 hover:text-text-ws-1 hover:bg-white/5"
  }
};

export function CommandButton({
  variant = "secondary",
  size = "md",
  theme = "admin",
  label,
  icon,
  disabled,
  loading = false,
  className = "",
  ...props
}: CommandButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30 disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[theme][variant]} ${className}`}
      {...props}
    >
      {loading ? <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      <span>{label}</span>
    </button>
  );
}
