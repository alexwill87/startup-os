/**
 * Agent key encryption — AES-256-GCM
 *
 * Master key: process.env.AGENT_KEY_MASTER (32 bytes, base64-encoded)
 * Each stored key has a random 12-byte IV prepended to the ciphertext.
 *
 * NEVER log, return in API, or store in DB the plaintext key.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getMasterKey() {
  const key = process.env.AGENT_KEY_MASTER;
  if (!key) throw new Error("AGENT_KEY_MASTER environment variable is not set");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("AGENT_KEY_MASTER must be exactly 32 bytes (base64-encoded)");
  return buf;
}

/**
 * Encrypt a plaintext API key.
 * Returns a base64 string: IV (12) + ciphertext + authTag (16)
 */
export function encryptKey(plaintext) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a stored ciphertext back to plaintext.
 * Input: base64 string from encryptKey()
 */
export function decryptKey(ciphertext) {
  const masterKey = getMasterKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Extract the last 4 characters of a key for safe display.
 */
export function keyLast4(plaintext) {
  return plaintext.slice(-4);
}
