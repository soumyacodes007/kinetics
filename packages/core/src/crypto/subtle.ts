export async function getSubtleCrypto(): Promise<any> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }

  const { webcrypto } = await import("node:crypto");
  return webcrypto.subtle;
}

export async function getCrypto(): Promise<any> {
  if (globalThis.crypto) {
    return globalThis.crypto;
  }

  const { webcrypto } = await import("node:crypto");
  return webcrypto as Crypto;
}
