import { Container, EmptyState } from "@/components/ui";

export default function ProductNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        title="We couldn't find that product"
        body="It may have sold out for good, or the link might be mistyped. There's plenty more in the shop."
        action={{ href: "/shop", label: "Browse all products" }}
      />
    </Container>
  );
}
