import type { Metadata } from "next";
import { ContentPage, HelpLinks } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Contact us",
  description: "How to reach the Fernhollow Goods studio.",
};

const WAYS = [
  {
    title: "Email",
    value: "hello@fernhollow.example",
    body: "The best way to reach us about orders, returns or custom pieces. We reply within two business days.",
  },
  {
    title: "Studio hours",
    value: "Tue–Sat, 10am–4pm PT",
    body: "We answer messages during studio hours. Thursday is candle-pouring day, so replies may be slower.",
  },
  {
    title: "Custom & wholesale",
    value: "studio@fernhollow.example",
    body: "Interested in a larger batch, a custom glaze or stocking our pieces? Tell us what you have in mind.",
  },
];

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="Get in touch"
      intro="Four makers, one small studio, and a real person on the other end of every email."
      demoNote={
        <>
          <strong>Demo store.</strong> These addresses use the reserved <code>.example</code> domain and aren&apos;t monitored. Nothing on this page sends a
          message.
        </>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-3">
        {WAYS.map((w) => (
          <li key={w.title} className="flex flex-col rounded-2xl border border-line bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">{w.title}</h2>
            <p className="mt-2 select-all break-words font-display text-lg font-semibold">{w.value}</p>
            <p className="mt-2 text-sm text-ink-soft">{w.body}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="include-heading" className="mt-10 rounded-2xl border border-line bg-paper-deep/60 p-6">
        <h2 id="include-heading" className="font-display text-xl font-semibold">
          Writing about an order?
        </h2>
        <p className="mt-2 text-ink-soft">
          Include your order reference (it looks like <strong className="text-ink">FH-ABCD-2345</strong>) and, for anything damaged, a photo of the piece
          and its packaging. We&apos;ll be able to help on the first reply.
        </p>
      </section>

      <HelpLinks exclude="contact" />
    </ContentPage>
  );
}
