import { getBytes, hexlify, isHexString, zeroPadValue } from "ethers";

export function ensureHex(input: string): string {
  const withPrefix = input.startsWith("0x") ? input : `0x${input}`;
  if (withPrefix.length % 2 === 1) {
    return `0x0${withPrefix.slice(2)}`;
  }
  return withPrefix;
}

export function ensureHex32(input: string): string {
  return zeroPadValue(ensureHex(input), 32);
}

export function isHex32(input: string): boolean {
  return isHexString(input, 32);
}

export function hexToBytes(input: string): Uint8Array {
  return getBytes(ensureHex(input));
}

export function bytesToHex(input: Uint8Array): string {
  return hexlify(input);
}
