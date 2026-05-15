import React from 'react';

// ─── Card ───────────────────────────────────────────────────────────────────
export function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border border-outline-variant/30 bg-surface-container-lowest rounded-xl shadow-sm ${props.className || ""}`}
    >
      {props.children}
    </div>
  );
}

export function CardContent(props: { children: React.ReactNode; className?: string }) {
  return <div className={props.className || ""}>{props.children}</div>;
}

// ─── AppButton ───────────────────────────────────────────────────────────────
// variant="solid"  → primary filled action
// variant="ghost"  → utility / secondary (outline on hover)
// variant="tonal"  → surface-tint filled (mid-emphasis)
// size="icon"      → square icon-only button
export function AppButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "solid" | "ghost" | "tonal";
    size?: "default" | "icon" | "sm";
  }
) {
  const { children, className = "", variant = "solid", size = "default", ...rest } = props;

  const base =
    size === "icon"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-md shrink-0"
      : size === "sm"
      ? "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-medium"
      : "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-body-md font-medium";

  const style =
    variant === "ghost"
      ? "bg-transparent text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest border border-outline-variant/40 hover:border-outline-variant"
      : variant === "tonal"
      ? "bg-primary-fixed/20 text-primary hover:bg-primary-fixed/30 active:bg-primary-fixed/40"
      : "bg-primary text-on-primary hover:opacity-90 active:opacity-80 shadow-sm";

  return (
    <button
      type="button"
      className={`${base} ${style} transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── AppInput ────────────────────────────────────────────────────────────────
export function AppInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full border border-outline-variant/25 bg-surface-container-lowest px-3 text-on-surface placeholder:text-on-surface-variant/40 outline-none rounded-md transition-all duration-150 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 ${className}`}
      {...rest}
    />
  );
}

// ─── AppSelect ───────────────────────────────────────────────────────────────
export function AppSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select
      className={`w-full border border-outline-variant/25 bg-surface-container-lowest px-2 text-on-surface outline-none rounded-md transition-all duration-150 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

// ─── AppCheckbox ─────────────────────────────────────────────────────────────
export function AppCheckbox(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { className = "", label, id, ...rest } = props;
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        className={`h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20 focus:ring-2 cursor-pointer ${className}`}
        {...rest}
      />
      {label && <span className="text-body-md text-on-surface">{label}</span>}
    </label>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge(props: {
  children: React.ReactNode;
  variant?: "primary" | "success" | "error" | "neutral";
  className?: string;
}) {
  const { children, variant = "neutral", className = "" } = props;
  const style = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-status-opener-bg text-status-opener-text border border-status-opener-text/20",
    error: "bg-error-container text-on-error-container border border-error/20",
    neutral: "bg-surface-container text-on-surface-variant border border-outline-variant/30",
  }[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-bold font-label-bold ${style} ${className}`}
    >
      {children}
    </span>
  );
}
