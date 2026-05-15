import { formatEther } from "ethers";

export function formatAddress(address: string): string {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBytes(value: number | bigint): string {
  const bytes = typeof value === "bigint" ? Number(value) : value;
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatTokenAmount(value: bigint | string): string {
  const wei = typeof value === "string" ? BigInt(value) : value;
  return `${Number(formatEther(wei)).toFixed(4)} 0G`;
}

export function formatTimestamp(timestamp: number | bigint): string {
  const seconds = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  if (!seconds) {
    return "Not set";
  }

  return new Date(seconds * 1000).toLocaleString();
}

export function formatCountdown(timestamp: number | bigint): string {
  const seconds = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  if (!seconds) {
    return "Inactive";
  }

  const delta = seconds - Math.floor(Date.now() / 1000);
  if (delta <= 0) {
    return "Expired";
  }

  const days = Math.floor(delta / (24 * 60 * 60));
  const hours = Math.floor((delta % (24 * 60 * 60)) / 3600);
  return `${days}d ${hours}h remaining`;
}

export function parseList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}
