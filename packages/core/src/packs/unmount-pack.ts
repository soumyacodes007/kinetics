import { MountedPack } from "../types/pack.js";

export function unmountPack(mountedPacks: MountedPack[], packId: number): MountedPack[] {
  return mountedPacks.filter((pack) => pack.packId !== packId);
}
