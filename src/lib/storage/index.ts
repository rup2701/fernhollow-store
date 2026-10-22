import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Photo storage behind a small adapter.
 *  - Deployed stores use Vercel Blob (set BLOB_READ_WRITE_TOKEN).
 *  - Development uses local disk (.uploads/), served at /media/<key>.
 * A deployed build never writes uploads to the server's own filesystem.
 */

export interface PhotoStorage {
  readonly name: "blob" | "local";
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  remove(key: string, url: string): Promise<void>;
}

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

export function localPathFor(key: string): string | null {
  const full = path.join(LOCAL_DIR, key);
  return full.startsWith(LOCAL_DIR + path.sep) ? full : null;
}

const localStorage: PhotoStorage = {
  name: "local",
  async put(key, data) {
    const file = localPathFor(key);
    if (!file) throw new Error("Invalid storage key");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return { url: `/media/${key}` };
  },
  async remove(key) {
    const file = localPathFor(key);
    if (file) await rm(file, { force: true });
  },
};

const blobStorage: PhotoStorage = {
  name: "blob",
  async put(key, data, contentType) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, data, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
    return { url: blob.url };
  },
  async remove(_key, url) {
    const { del } = await import("@vercel/blob");
    await del(url);
  },
};

/** A deployed build is any production build that has not explicitly allowed local uploads. */
function isDeployedBuild() {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "1";
}

export type StorageStatus = { ok: true; storage: PhotoStorage } | { ok: false; message: string };

export function getStorage(): StorageStatus {
  if (process.env.BLOB_READ_WRITE_TOKEN) return { ok: true, storage: blobStorage };
  if (!isDeployedBuild()) return { ok: true, storage: localStorage };
  return {
    ok: false,
    message:
      "Photo storage isn't set up yet, so photos can't be uploaded. Add a Vercel Blob store to this project (it provides BLOB_READ_WRITE_TOKEN), redeploy, then try again.",
  };
}

/** Called once at startup: a deployed store without storage must not boot and silently lose uploads. */
export function assertStorageConfigured() {
  const status = getStorage();
  if (!status.ok) throw new Error(`Startup check failed: ${status.message}`);
}

export async function readLocal(key: string): Promise<Buffer | null> {
  const file = localPathFor(key);
  if (!file) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}
