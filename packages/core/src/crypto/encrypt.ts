import { bytesToHex } from "../utils/hex.js";
import { getCrypto, getSubtleCrypto } from "./subtle.js";

export async function encryptBytes(plaintext: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const subtle = await getSubtleCrypto();
  const cryptoApi = await getCrypto();
  const cryptoKey = await subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const nonce = cryptoApi.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, plaintext);

  const body = new Uint8Array(ciphertext);
  const output = new Uint8Array(nonce.length + body.length);
  output.set(nonce, 0);
  output.set(body, nonce.length);
  return output;
}

export async function encryptJson<T>(value: T, key: Uint8Array): Promise<string> {
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await encryptBytes(plaintext, key);
  return bytesToHex(ciphertext);
}
