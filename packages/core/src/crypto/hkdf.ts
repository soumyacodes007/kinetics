import { getSubtleCrypto } from "./subtle.js";

export async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length = 32
): Promise<Uint8Array> {
  const subtle = await getSubtleCrypto();
  const key = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info
    },
    key,
    length * 8
  );

  return new Uint8Array(bits);
}
