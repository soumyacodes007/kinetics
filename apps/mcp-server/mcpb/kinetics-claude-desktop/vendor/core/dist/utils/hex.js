import { getBytes, hexlify, isHexString, zeroPadValue } from "ethers";
export function ensureHex(input) {
    const withPrefix = input.startsWith("0x") ? input : `0x${input}`;
    if (withPrefix.length % 2 === 1) {
        return `0x0${withPrefix.slice(2)}`;
    }
    return withPrefix;
}
export function ensureHex32(input) {
    return zeroPadValue(ensureHex(input), 32);
}
export function isHex32(input) {
    return isHexString(input, 32);
}
export function hexToBytes(input) {
    return getBytes(ensureHex(input));
}
export function bytesToHex(input) {
    return hexlify(input);
}
//# sourceMappingURL=hex.js.map