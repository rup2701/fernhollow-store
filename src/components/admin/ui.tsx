export const inputClass =
  "w-full rounded-xl border bg-card px-4 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-ink/50";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-0.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: React.ReactNode }) {
  const styles = {
    ok: "border-moss/30 bg-moss-soft text-ink",
    error: "border-danger/30 bg-danger-soft text-danger",
    info: "border-line bg-paper-deep text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

export function StatusBadge({ published, soldOut }: { published: boolean; soldOut?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${published ? "bg-moss-soft text-moss" : "bg-paper-deep text-ink-soft"}`}>
        {published ? "Published" : "Draft"}
      </span>
      {soldOut ? <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger">Sold out</span> : null}
    </span>
  );
}
