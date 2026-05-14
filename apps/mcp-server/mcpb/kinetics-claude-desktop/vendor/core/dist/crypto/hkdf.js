import { getSubtleCrypto } from "./subtle.js";
export async function hkdfSha256(ikm, salt, info, length = 32) {
    const subtle = await getSubtleCrypto();
    const key = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    const bits = await subtle.deriveBits({
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info
    }, key, length * 8);
    return new Uint8Array(bits);
}
//# sourceMappingURL=hkdf.js.map