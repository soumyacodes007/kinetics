export async function getSubtleCrypto() {
    if (globalThis.crypto?.subtle) {
        return globalThis.crypto.subtle;
    }
    const { webcrypto } = await import("node:crypto");
    return webcrypto.subtle;
}
export async function getCrypto() {
    if (globalThis.crypto) {
        return globalThis.crypto;
    }
    const { webcrypto } = await import("node:crypto");
    return webcrypto;
}
//# sourceMappingURL=subtle.js.map