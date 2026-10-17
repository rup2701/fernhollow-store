import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, HelpLinks, Section } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "How returns, exchanges and refunds work at Fernhollow Goods.",
};

const AT_A_GLANCE = [
  { value: "30 days", label: "to start a return from delivery" },
  { value: "3 days", label: "to issue your refund once your return arrives" },
  { value: "Free", label: "return shipping if we made a mistake" },
];

export default function ReturnsPage() {
  return (
    <ContentPage
      eyebrow="Policies"
      title="Returns & refunds"
      intro="Everything we make is checked twice before it ships, but if something isn't right for you, we'll make it right. Here's how."
      demoNote={
        <>
          <strong>Sample policy.</strong> Fernhollow Goods is a demo store, so no orders are fulfilled and no returns or refunds are actually processed.
        </>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Policy at a glance">
        {AT_A_GLANCE.map((item) => (
          <li key={item.value} className="rounded-2xl border border-line bg-card p-5">
            <p className="font-display text-3xl font-semibold text-clay">{item.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{item.label}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <Section id="window" title="Return window and condition">
          <p>
            You can return most pieces within <strong>30 days of delivery</strong>. Items should be unused, in their original condition and packaging.
            Candles must be unburned.
          </p>
          <p>Because every piece is handmade, small variations in glaze, grain, weave or colour are part of the character, not a defect.</p>
        </Section>

        <Section id="start" title="How to start a return">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Email <strong>hello@fernhollow.example</strong> with your order reference (it looks like <strong>FH-ABCD-2345</strong>) and the items
              you&apos;d like to return.
            </li>
            <li>We&apos;ll reply within two business days with a return address and instructions.</li>
            <li>Pack the items securely, ideally in the box they arrived in, and send them back with a tracked service.</li>
          </ol>
        </Section>

        <Section id="refunds" title="Refunds">
          <p>
            Once your return arrives and we&apos;ve checked it over, we refund the item price to your <strong>original payment method</strong>. Refunds are
            issued within 3 business days of receipt; your bank may take a further 5–10 business days to show it.
          </p>
          <p>Original shipping charges are refunded only when the return is due to our error.</p>
        </Section>

        <Section id="shipping" title="Return shipping costs">
          <p>
            Return shipping is paid by you, unless the item arrived <strong>damaged, faulty or not what you ordered</strong>. In that case we send a
            prepaid label.
          </p>
        </Section>

        <Section id="exchanges" title="Exchanges">
          <p>
            Want a different glaze, size or colour? Start a return for the original and place a new order for the one you&apos;d like. That way it ships
            straight away instead of waiting for your return to arrive.
          </p>
        </Section>

        <Section id="final-sale" title="Personalized pieces are final sale">
          <p>
            Engraved boards, stamped pendants and journals with a name on the cover are made just for you, so they <strong>can&apos;t be returned or
            exchanged</strong> unless they arrive damaged or with a mistake on our part. Please double-check spelling before adding to your cart.
          </p>
        </Section>

        <Section id="damaged" title="Damaged or incorrect items">
          <p>
            If something arrives broken or isn&apos;t what you ordered, email us within <strong>7 days of delivery</strong> with a photo of the item and the
            packaging. We&apos;ll send a replacement or a full refund, including shipping, and you won&apos;t need to send the broken piece back.
          </p>
        </Section>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        Still have a question?{" "}
        <Link href="/contact" className="font-semibold text-clay underline underline-offset-4">
          Get in touch
        </Link>
        .
      </p>
      <HelpLinks exclude="returns" />
    </ContentPage>
  );
}
