import { readLocal } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves locally stored photos (development). Deployed stores serve from object storage instead. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  const data = await readLocal(joined);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = joined.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" },
  });
}
