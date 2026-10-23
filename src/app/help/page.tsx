import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, HelpLinks } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description: "Answers about shipping, returns, personalization and caring for handmade pieces.",
};

type QA = { q: string; a: React.ReactNode };

const TOPICS: { id: string; title: string; items: QA[] }[] = [
  {
    id: "orders",
    title: "Orders & shipping",
    items: [
      { q: "How long does shipping take?", a: "Pieces in stock ship in 3–5 business days. Personalized pieces take an extra 2–3 days because we make them to order." },
      { q: "How much is shipping?", a: "A flat $6 (a demo estimate), and free on orders over $75." },
      {
        q: "Can I change my order after placing it?",
        a: (
          <>
            Email us with your order reference within 24 hours and we&apos;ll do our best. After that, your piece may already be on the bench.
          </>
        ),
      },
    ],
  },
  {
    id: "returns",
    title: "Returns",
    items: [
      {
        q: "What's your return policy?",
        a: (
          <>
            Most pieces can be returned within 30 days of delivery. Personalized pieces are final sale unless damaged. See{" "}
            <Link href="/returns" className="font-semibold text-clay underline underline-offset-4">
              Returns &amp; refunds
            </Link>{" "}
            for the full details.
          </>
        ),
      },
      { q: "Something arrived broken. What do I do?", a: "Email a photo within 7 days of delivery. We'll replace it or refund you in full; no need to send it back." },
    ],
  },
  {
    id: "personalization",
    title: "Personalization",
    items: [
      { q: "Which pieces can be personalized?", a: "The walnut board (engraving), brass pendant (initials) and leather journal (name on cover). Look for the “Personalizable” tag in the shop." },
      { q: "What characters can I use?", a: "Letters, numbers, spaces and & . , ' -. The limit depends on the piece and is shown under the text box, with a live preview on the product image." },
      { q: "Can I return a personalized piece?", a: "Only if it arrives damaged or we made a mistake, since it's made just for you." },
    ],
  },
  {
    id: "care",
    title: "Caring for your pieces",
    items: [
      { q: "Are the ceramics dishwasher safe?", a: "Mugs are dishwasher and microwave safe. We recommend hand washing serving bowls and the porcelain vase." },
      { q: "How do I look after the walnut board?", a: "Hand wash, dry upright, and rub in a little food-safe oil once a month. Never soak it or put it in the dishwasher." },
      { q: "Will the brass pendant tarnish?", a: "Brass develops a warm patina over time. A soft cloth brings back the shine if you prefer it bright." },
    ],
  }
];

export default function HelpPage() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Help & FAQ"
      intro="Quick answers to the questions we hear most. Can't find yours? We're happy to help."
      demoNote={
        <>
          <strong>Demo store.</strong> Answers describe how the store would work; no orders are fulfilled.
        </>
      }
    >
      <nav aria-label="Help topics">
        <ul className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="inline-flex rounded-full border border-line bg-card px-4 py-2 text-sm font-medium hover:border-ink/40">
                {t.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-12">
        {TOPICS.map((topic) => (
          <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-heading`} className="scroll-mt-24">
            <h2 id={`${topic.id}-heading`} className="font-display text-2xl font-semibold">
              {topic.title}
            </h2>
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
              {topic.items.map((item) => (
                <details key={item.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span aria-hidden="true" className="text-xl leading-none text-ink-soft transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <HelpLinks exclude="help" />
    </ContentPage>
  );
}
