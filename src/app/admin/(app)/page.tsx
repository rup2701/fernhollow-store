import { redirect } from "next/navigation";

export default function OwnerHome() {
  redirect("/admin/products");
}
