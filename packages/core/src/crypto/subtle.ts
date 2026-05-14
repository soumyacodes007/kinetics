export async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }

  const { webcrypto } = await import("node:crypto");
  return webcrypto.subtle;
}

export async function getCrypto(): Promise<Crypto> {
  if (globalThis.crypto) {
    return globalThis.crypto;
  }

  const { webcrypto } = await import("node:crypto");
  return webcrypto as Crypto;
}
