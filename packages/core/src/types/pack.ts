export type PackKind = "skill_only" | "knowledge_only" | "hybrid";

export interface PackPreviewManifest {
  packId: number;
  slug: string;
  title: string;
  shortDescription: string;
  packKind: PackKind;
  tags: string[];
  keywords: string[];
  priceWei: string;
  licenseDurationDays: number;
  previewFiles: string[];
  currentVersion: number;
  creator: string;
  createdAt: number;
  updatedAt: number;
}

export interface PackBundleFile {
  path: string;
  content: string;
}

export interface PackKnowledgeDoc {
  docId: string;
  title: string;
  text: string;
}

export interface PackMountInstructions {
  systemPromptAddition: string;
  recommendedTools: string[];
}

export interface EncryptedPackBundlePayload {
  packId: number;
  version: number;
  packKind: PackKind;
  files: PackBundleFile[];
  knowledgeDocs: PackKnowledgeDoc[];
  mountInstructions: PackMountInstructions;
  changelog: string;
}

export interface MountedPack {
  packId: number;
  version: number;
  manifest: PackPreviewManifest;
  bundle: EncryptedPackBundlePayload;
  mountedAt: number;
}
