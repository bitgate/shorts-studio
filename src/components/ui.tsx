import { useId, type ReactNode, type SVGProps } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Paths from Lucide (ISC)
const ICONS = {
  check: <path d="M20 6 9 17l-5-5" />,
  copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  arrowUpRight: <path d="M7 7h10v10M7 17 17 7" />,
  arrowLeft: <path d="m12 19-7-7 7-7M19 12H5" />,
  retry: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  spinner: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  plus: <path d="M5 12h14M12 5v14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  pencil: <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5zM15 5l4 4" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", name === "spinner" && "animate-spin", className)}
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}

export function Label({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <span className="text-[14px] font-semibold">{children}</span>
      {aside && <span className="truncate text-[13px] text-dim">{aside}</span>}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-danger">
      <Icon name="alert" className="size-3.5" />
      {message}
    </p>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: SegmentedProps<T>) {
  const name = useId();

  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-field p-1">
      {options.map((option) => (
        <label
          key={String(option.value)}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-[9px] px-2 text-[14px] whitespace-nowrap transition-colors",
            "has-focus-visible:outline-2 has-focus-visible:outline-glow",
            option.value === value
              ? "bg-raised font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.14)]"
              : "text-dim hover:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

interface SelectProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
  error?: string;
}

export function Select<T extends string>({ label, hint, value, options, onChange, disabled, error }: SelectProps<T>) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold">{label}</span>
        {hint && <span className="truncate text-[13px] text-dim">{hint}</span>}
      </span>
      <span className="relative block">
        <select
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(
            "h-11 w-full appearance-none truncate rounded-xl border bg-panel pr-9 pl-3 text-[16px] transition-colors",
            "hover:border-dim disabled:cursor-not-allowed disabled:text-dim disabled:hover:border-edge",
            error ? "border-danger" : "border-edge",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-dim" />
      </span>
      <FieldError message={error} />
    </label>
  );
}

const BUTTON = {
  primary: "bg-accent text-on-accent hover:brightness-110 active:brightness-95",
  secondary: "border border-edge bg-panel text-ink hover:border-dim",
  ghost: "text-dim hover:bg-field hover:text-ink",
};

export function buttonClass(kind: keyof typeof BUTTON, className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    BUTTON[kind],
    className,
  );
}
