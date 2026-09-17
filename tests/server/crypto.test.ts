import { beforeEach, describe, expect, it, vi } from "vitest";

import { decrypt, encrypt } from "@/server/lib/crypto";

describe("crypto", () => {
  const testKey = "AajtTjwk596h9uSeJ1S+wZ5e714Exd3CEWX9ELpOQrE=";

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", testKey);
  });

  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "12345678901";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext", () => {
    const plaintext = "12345678901";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it("throws on invalid encrypted data", () => {
    expect(() => decrypt("invalid")).toThrow("Invalid encrypted data");
  });

  it("throws on tampered ciphertext", () => {
    const plaintext = "12345678901";
    const encrypted = encrypt(plaintext);
    const data = Buffer.from(encrypted, "base64");
    data[data.length - 1] ^= 0xff;
    const tampered = data.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });
});
