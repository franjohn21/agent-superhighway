import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./env";

/**
 * Envelope encryption for message bodies. MESSAGE_KEY wraps one data key per
 * inbox; the data key encrypts every stored body, html, and raw message.
 * Format: v1.<iv>.<tag>.<ciphertext>, all base64.
 */
const ALGORITHM = "aes-256-gcm";

function masterKey(): Buffer {
  const key = Buffer.from(env.messageKey, "base64");
  if (key.length !== 32) throw new Error("MESSAGE_KEY must be 32 bytes, base64 encoded");
  return key;
}

function seal(key: Buffer, plaintext: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

function open(key: Buffer, sealed: string): Buffer {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unrecognized ciphertext format");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
}

/** A fresh data key for a new inbox, returned already wrapped for storage. */
export function newWrappedDataKey(): string {
  return seal(masterKey(), randomBytes(32));
}

export class InboxCipher {
  private readonly key: Buffer;

  constructor(wrappedDataKey: string) {
    this.key = open(masterKey(), wrappedDataKey);
  }

  encrypt(plaintext: string | Buffer): string {
    return seal(this.key, Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8"));
  }

  decrypt(sealed: string): string {
    return open(this.key, sealed).toString("utf8");
  }

  decryptBuffer(sealed: string): Buffer {
    return open(this.key, sealed);
  }
}
