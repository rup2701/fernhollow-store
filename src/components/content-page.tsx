import Link from "next/link";
import { Container, DemoNotice } from "@/components/ui";

/** Shared shell for text pages (returns, help, contact). */
export function ContentPage({
  eyebrow,
  title,
  intro,
  demoNote,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  demoNote: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-moss">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{intro}</p>
        <DemoNotice className="mt-6">{demoNote}</DemoNotice>
        <div className="mt-10">{children}</div>
      </div>
    </Container>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-24 border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 id={id ? `${id}-heading` : undefined} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-soft [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export function HelpLinks({ exclude }: { exclude?: "help" | "returns" | "contact" }) {
  const links = [
    { id: "help", href: "/help", label: "Help & FAQ", body: "Shipping, personalization, care and more." },
    { id: "returns", href: "/returns", label: "Returns & refunds", body: "30-day returns on most pieces." },
    { id: "contact", href: "/contact", label: "Contact us", body: "A real person replies within two business days." },
  ].filter((l) => l.id !== exclude);
  return (
    <ul className="mt-12 grid gap-4 sm:grid-cols-2">
      {links.map((l) => (
        <li key={l.id} className="relative rounded-2xl border border-line bg-card p-5 transition-colors hover:border-ink/30">
          <Link href={l.href} className="font-display text-lg font-semibold after:absolute after:inset-0 after:content-['']">
            {l.label} <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-1 text-sm text-ink-soft">{l.body}</p>
        </li>
      ))}
    </ul>
  );
}
