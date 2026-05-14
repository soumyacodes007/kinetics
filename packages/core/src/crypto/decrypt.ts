import { hexToBytes } from "../utils/hex.js";
import { getSubtleCrypto } from "./subtle.js";

export async function decryptBytes(ciphertext: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  if (ciphertext.length < 13) {
    throw new Error("Ciphertext is too short for AES-GCM");
  }

  const subtle = await getSubtleCrypto();
  const nonce = ciphertext.slice(0, 12);
  const body = ciphertext.slice(12);
  const cryptoKey = await subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, body);
  return new Uint8Array(plaintext);
}

export async function decryptJson<T>(ciphertextHex: string, key: Uint8Array): Promise<T> {
  const bytes = await decryptBytes(hexToBytes(ciphertextHex), key);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
