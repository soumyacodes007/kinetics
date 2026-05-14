import { EncryptedPackBundlePayload, PackPreviewManifest, PackKind } from "../types/pack.js";

export interface CreatePackDraftInput {
  slug: string;
  title: string;
  shortDescription: string;
  packKind: PackKind;
  tags: string[];
  keywords: string[];
  previewFiles: string[];
  files: EncryptedPackBundlePayload["files"];
  knowledgeDocs?: EncryptedPackBundlePayload["knowledgeDocs"];
  mountInstructions: EncryptedPackBundlePayload["mountInstructions"];
  changelog?: string;
  priceWei: string;
  licenseDurationDays: number;
  creator: string;
  now?: number;
}

export function createPackDraft(input: CreatePackDraftInput): {
  manifest: PackPreviewManifest;
  bundle: EncryptedPackBundlePayload;
} {
  const now = input.now ?? Math.floor(Date.now() / 1000);

  return {
    manifest: {
      packId: 0,
      slug: input.slug,
      title: input.title,
      shortDescription: input.shortDescription,
      packKind: input.packKind,
      tags: [...new Set(input.tags)],
      keywords: [...new Set(input.keywords)],
      priceWei: input.priceWei,
      licenseDurationDays: input.licenseDurationDays,
      previewFiles: input.previewFiles,
      currentVersion: 1,
      creator: input.creator,
      createdAt: now,
      updatedAt: now
    },
    bundle: {
      packId: 0,
      version: 1,
      packKind: input.packKind,
      files: input.files,
      knowledgeDocs: input.knowledgeDocs ?? [],
      mountInstructions: input.mountInstructions,
      changelog: input.changelog ?? "Initial version"
    }
  };
}
