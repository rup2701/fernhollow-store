"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { movePhoto, removePhoto, updatePhotoAlt } from "@/app/admin/actions";
import { LIMITS } from "@/lib/admin/validation";
import { Notice } from "@/components/admin/ui";

type Photo = { id: number; url: string; alt: string; width: number };
type Upload = { key: number; file: File; progress: number; status: "uploading" | "failed" | "done"; message?: string; note?: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const small = "rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-ink/40 disabled:opacity-40";

export function PhotoManager({
  productId,
  photos,
  starterPhoto,
  storageMessage,
}: {
  productId: number;
  photos: Photo[];
  starterPhoto: { url: string; alt: string } | null;
  storageMessage: string | null;
}) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [pending, startTransition] = useTransition();
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const room = LIMITS.photos - photos.length - uploads.filter((u) => u.status === "uploading").length;

  function patch(key: number, p: Partial<Upload>) {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));
  }

  function send(key: number, file: File) {
    // Same checks the server makes, so the owner hears about a problem right away.
    if (!ALLOWED.includes(file.type)) return patch(key, { status: "failed", message: `"${file.name}" isn't a JPEG, PNG or WebP image.` });
    if (file.size > LIMITS.photoBytes) return patch(key, { status: "failed", message: `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB. Photos can be 5 MB at most.` });

    patch(key, { status: "uploading", progress: 0, message: undefined });
    const body = new FormData();
    body.set("productId", String(productId));
    body.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/api/photos");
    xhr.upload.onprogress = (e) => e.lengthComputable && patch(key, { progress: Math.round((e.loaded / e.total) * 100) });
    xhr.onerror = () => patch(key, { status: "failed", message: "The upload was interrupted. Check your connection and retry." });
    xhr.onload = () => {
      let json: { ok?: boolean; message?: string; resized?: boolean } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && json.ok) {
        patch(key, { status: "done", progress: 100, note: json.resized ? "Resized for the web. The original is kept." : undefined });
        router.refresh();
      } else {
        patch(key, { status: "failed", message: json.message ?? "That upload failed. Please retry." });
      }
    };
    xhr.send(body);
  }

  function add(files: FileList | null) {
    if (!files) return;
    const list = [...files];
    const allowed = list.slice(0, Math.max(room, 0));
    const skipped = list.length - allowed.length;
    const items: Upload[] = allowed.map((file) => ({ key: ++counter.current, file, progress: 0, status: "uploading" }));
    if (skipped > 0) {
      items.push({
        key: ++counter.current,
        file: list[allowed.length],
        progress: 0,
        status: "failed",
        message: `Only ${LIMITS.photos} photos fit on a product. ${skipped} ${skipped === 1 ? "photo was" : "photos were"} not added.`,
      });
    }
    setUploads((u) => [...u, ...items]);
    for (const it of items.slice(0, allowed.length)) send(it.key, it.file);
    if (inputRef.current) inputRef.current.value = "";
  }

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <section aria-labelledby="photos-heading" className="rounded-2xl border border-line bg-card p-5">
      <h2 id="photos-heading" className="font-display text-xl font-semibold">
        Photos
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Up to {LIMITS.photos} photos, JPEG, PNG or WebP, 5 MB each. The first photo is the cover shown on cards. Wide photos at least {LIMITS.softWidth} pixels across look best.
      </p>

      {storageMessage ? (
        <div className="mt-4">
          <Notice tone="error">{storageMessage}</Notice>
        </div>
      ) : null}

      {photos.length === 0 && starterPhoto ? (
        <p className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={starterPhoto.url} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
          This product is using a starter photo. Your first upload replaces it.
        </p>
      ) : null}

      {photos.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {photos.map((p, i) => (
            <li key={p.id} className="flex gap-3 rounded-xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-moss">{i === 0 ? "Cover" : `Photo ${i + 1}`}</p>
                <label htmlFor={`alt-${p.id}`} className="sr-only">
                  Description of photo {i + 1} for people who can&apos;t see it
                </label>
                <input
                  id={`alt-${p.id}`}
                  defaultValue={p.alt}
                  maxLength={200}
                  onBlur={(e) => e.target.value !== p.alt && run(() => updatePhotoAlt(p.id, e.target.value))}
                  className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm"
                />
                <p className="mt-1 text-xs text-ink-soft">Description for people who can&apos;t see the photo.</p>
                {p.width < LIMITS.softWidth ? (
                  <p className="mt-1 text-xs font-medium text-clay">Only {p.width} pixels wide. It may look soft on large screens.</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {i > 0 ? (
                    <button type="button" className={small} disabled={pending} onClick={() => run(() => movePhoto(p.id, "cover"))}>
                      Make cover
                    </button>
                  ) : null}
                  <button type="button" className={small} disabled={pending || i === 0} aria-label={`Move photo ${i + 1} earlier`} onClick={() => run(() => movePhoto(p.id, "up"))}>
                    Earlier
                  </button>
                  <button
                    type="button"
                    className={small}
                    disabled={pending || i === photos.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    onClick={() => run(() => movePhoto(p.id, "down"))}
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    className={`${small} text-danger`}
                    disabled={pending}
                    onClick={() => window.confirm("Remove this photo?") && run(() => removePhoto(p.id))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {uploads.length > 0 ? (
        <ul className="mt-5 space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className="rounded-xl border border-line px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="truncate font-medium">{u.file.name}</span>
                {u.status === "uploading" ? <span className="tabular-nums text-ink-soft">Uploading {u.progress}%</span> : null}
                {u.status === "done" ? <span className="text-moss">Added{u.note ? `. ${u.note}` : ""}</span> : null}
                {u.status === "failed" ? (
                  <span className="flex items-center gap-3">
                    <button type="button" className="font-semibold text-clay underline underline-offset-4" onClick={() => send(u.key, u.file)}>
                      Retry
                    </button>
                    <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setUploads((l) => l.filter((x) => x.key !== u.key))}>
                      Dismiss
                    </button>
                  </span>
                ) : null}
              </div>
              {u.status === "uploading" ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.file.name}`}>
                  <div className="h-full bg-clay transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              ) : null}
              {u.status === "failed" && u.message ? <p className="mt-1 font-medium text-danger">{u.message}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5">
        <input
          ref={inputRef}
          id="photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={Boolean(storageMessage) || room <= 0}
          onChange={(e) => add(e.target.files)}
          className="block w-full max-w-md text-sm file:mr-3 file:rounded-full file:border-0 file:bg-clay file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-clay-deep"
        />
        <label htmlFor="photo-input" className="sr-only">
          Add photos
        </label>
        {room <= 0 ? <p className="mt-2 text-sm text-ink-soft">This product has {LIMITS.photos} photos. Remove one to add another.</p> : null}
      </div>
    </section>
  );
}
