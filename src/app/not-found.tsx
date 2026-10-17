import { Container, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        title="We couldn't find that page"
        body="The link may be old or mistyped. The shop is the best place to pick things back up."
        action={{ href: "/shop", label: "Back to the shop" }}
      />
    </Container>
  );
}
