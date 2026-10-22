import { randomBytes, scryptSync } from "node:crypto";

// Usage: npm run owner:hash -- "your password"
const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: npm run owner:hash -- "a password of at least 8 characters"');
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
console.log("Add these to .env (and to your host's environment settings):\n");
console.log(`OWNER_EMAIL="you@example.com"`);
console.log(`OWNER_PASSWORD_HASH="scrypt:${salt}:${hash}"`);
console.log(`SESSION_SECRET="${randomBytes(24).toString("hex")}"`);
