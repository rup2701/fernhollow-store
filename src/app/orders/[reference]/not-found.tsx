import { Container, EmptyState } from "@/components/ui";

export default function OrderNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        title="We couldn't find that order"
        body="Double-check the reference (it looks like FH-ABCD-2345). Demo orders aren't tied to an account, so the confirmation link is the only way back to one."
        action={{ href: "/shop", label: "Back to the shop" }}
      />
    </Container>
  );
}
