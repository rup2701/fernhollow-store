import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema } from "@/db";

/**
 * Owner sign-in. One owner; email and password hash come from environment
 * configuration (OWNER_EMAIL, OWNER_PASSWORD_HASH, SESSION_SECRET), never from
 * code or the database. Make a hash with: npm run owner:hash -- "your password"
 */

const COOKIE = "fh_owner";
export const SESSION_DAYS = 7;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function ownerConfigured(): boolean {
  return Boolean(process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD_HASH && sessionSecret());
}

function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()!).update(payload).digest("base64url");
}

function makeToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 86_400_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function tokenValid(token: string | undefined): boolean {
  if (!token || !sessionSecret()) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** True when the request carries a valid owner session. */
export async function isOwner(): Promise<boolean> {
  return tokenValid((await cookies()).get(COOKIE)?.value);
}

async function clientAddress(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export type SignInResult = { ok: true } | { ok: false; message: string; locked?: boolean };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const ip = await clientAddress();
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000);

  const [{ failures }] = await db
    .select({ failures: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, ip), gt(schema.loginAttempts.at, since)));
  if (failures >= MAX_FAILED_ATTEMPTS) {
    return { ok: false, locked: true, message: `Too many attempts. Sign-in is paused for ${LOCKOUT_MINUTES} minutes. Please try again later.` };
  }

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const hash = process.env.OWNER_PASSWORD_HASH;
  // Always run the hash check so timing does not reveal whether the email matched.
  const passwordOk = hash ? verifyPassword(password, hash) : false;
  const emailOk = Boolean(ownerEmail) && email.trim().toLowerCase() === ownerEmail;

  if (!ownerConfigured() || !emailOk || !passwordOk) {
    await db.insert(schema.loginAttempts).values({ ip });
    return { ok: false, message: "That email and password don't match. Please check them and try again." };
  }

  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.ip, ip));
  (await cookies()).set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return { ok: true };
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
