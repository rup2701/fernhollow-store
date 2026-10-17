import Link from "next/link";

/** Shared class names so buttons and links look identical everywhere. */
export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 bg-card px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink/40 hover:bg-paper-deep",
  ghost: "inline-flex items-center gap-1.5 text-sm font-semibold text-clay underline-offset-4 hover:text-clay-deep hover:underline",
};

export function DemoNotice({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 rounded-xl border border-moss/25 bg-moss-soft px-4 py-3 text-sm text-ink ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-moss" fill="currentColor">
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm1.2 9.5H8.8v-6h2.4v6Z" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-ink-soft">{body}</p>
      {action ? (
        <Link href={action.href} className={`${buttonStyles.primary} mt-6`}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Width of the browsing pages (home, shop, product, header, footer). Text-heavy pages keep the narrower Container. */
export const WIDE_SHELL = "mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-10";

export function Container({ children, className = "", wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={`${wide ? WIDE_SHELL : "mx-auto max-w-6xl px-4 sm:px-6"} ${className}`}>{children}</div>;
}
